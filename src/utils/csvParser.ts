import Papa from 'papaparse';
import { DataPoint } from '../types';

interface ParseResult {
  data: DataPoint[];
  metricName: string;
  detectedMetrics: string[];
  rawData: any[][];
  headerRow: string[];
  dateColumnIndex: number;
  dataStartIndex: number;
}

export const parseCSV = (file: File, selectedMetric?: string): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          console.log('Raw CSV results:', results);
          
          // Find the correct header row - look for one that contains "Date" or "date"
          let headerRowIndex = -1;
          let dataStartIndex = -1;
          
          for (let i = 0; i < results.data.length; i++) {
            const row = results.data[i] as string[];
            
            // Skip empty rows and comment rows
            if (!row || row.length === 0) continue;
            
            const firstCell = row[0]?.toString().trim() || '';
            if (firstCell.startsWith('#')) continue;
            
            // Look for a row that contains "Date" in any column (case insensitive)
            const hasDateColumn = row.some(cell => 
              cell?.toString().toLowerCase().trim() === 'date'
            );
            
            if (hasDateColumn) {
              headerRowIndex = i;
              dataStartIndex = i + 1;
              console.log('Found header row at index:', i, 'Row content:', row);
              break;
            }
          }
          
          console.log('Header row index:', headerRowIndex, 'Data starts at:', dataStartIndex);
          
          if (headerRowIndex === -1) {
            reject(new Error('Could not find header row containing "Date" column in CSV'));
            return;
          }
          
          const headerRow = results.data[headerRowIndex] as string[];
          console.log('Using header row:', headerRow);
          
          // Find date column
          let dateColumnIndex = -1;
          headerRow.forEach((header, index) => {
            if (header?.toString().toLowerCase().trim() === 'date') {
              dateColumnIndex = index;
            }
          });
          
          // Find metric column (any numeric column that's not the date)
          const detectedMetrics: string[] = [];
          const metricColumns: { index: number; name: string }[] = [];
          
          // Look for common metric patterns
          const metricPatterns = [
            'revenue', 'sales', 'amount', 'value', 'total', 'sum', 'count',
            'quantity', 'volume', 'price', 'cost', 'profit', 'income',
            'expense', 'budget', 'target', 'actual', 'forecast', 'clicks',
            'impressions', 'views', 'sessions', 'users', 'conversions',
            'ctr', 'cpc', 'cpm', 'roas', 'roi', 'bounce', 'rate'
          ];
          
          // First pass: identify all potential metric columns
          for (let i = 0; i < headerRow.length; i++) {
            if (i === dateColumnIndex) continue; // Skip date column
            
            const header = headerRow[i]?.toString().toLowerCase().trim() || '';
            const originalHeader = headerRow[i]?.toString().trim() || '';
            
            // Skip empty headers or obvious non-metric columns
            if (!header || header === 'date' || header.includes('id') || header.includes('name')) {
              continue;
            }
            
            // Check if this column contains numeric data by sampling a few rows
            let hasNumericData = false;
            for (let sampleRow = dataStartIndex; sampleRow < Math.min(dataStartIndex + 5, results.data.length); sampleRow++) {
              const sampleData = results.data[sampleRow] as string[];
              if (sampleData && sampleData[i]) {
                const value = sampleData[i].toString().trim().replace(/[,\s]/g, '');
                if (!isNaN(parseFloat(value)) && value !== '') {
                  hasNumericData = true;
                  break;
                }
              }
            }
            
            // If it has numeric data, consider it a potential metric
            if (hasNumericData) {
              const isKnownMetric = metricPatterns.some(pattern => 
                header.includes(pattern)
              );
              
              const cleanName = originalHeader || `Column ${i + 1}`;
              detectedMetrics.push(cleanName);
              metricColumns.push({ index: i, name: cleanName });
            }
          }
          
          console.log('Detected metrics:', detectedMetrics);
          console.log('Metric columns:', metricColumns);
          
          // Select metric column based on selectedMetric parameter or default
          let metricColumnIndex = -1;
          let metricName = 'Value';
          
          // If a specific metric was requested, try to find it
          if (selectedMetric && detectedMetrics.includes(selectedMetric)) {
            const targetColumn = metricColumns.find(col => col.name === selectedMetric);
            if (targetColumn) {
              metricColumnIndex = targetColumn.index;
              metricName = targetColumn.name;
              console.log('Using requested metric:', selectedMetric, 'at column:', metricColumnIndex);
            }
          }
          
          // If no specific metric requested or not found, use default logic
          if (metricColumns.length > 0) {
            if (metricColumnIndex === -1) {
              // Prioritize columns with known metric patterns
              const prioritizedColumn = metricColumns.find(col => {
                const header = col.name.toLowerCase();
                return metricPatterns.some(pattern => 
                header.includes(pattern)
                );
              }) || metricColumns[0]; // Fall back to first column if no pattern match
              
              metricColumnIndex = prioritizedColumn.index;
              metricName = prioritizedColumn.name;
              console.log('Selected default metric column:', metricColumnIndex, 'Name:', metricName);
            }
          } else {
            // Fallback: use first non-date column
            for (let i = 0; i < headerRow.length; i++) {
              if (i !== dateColumnIndex) {
                metricColumnIndex = i;
                metricName = headerRow[i]?.toString().trim() || 'Value';
                detectedMetrics.push(metricName);
                console.log('Using fallback metric column:', i, 'Header:', metricName);
                break;
              }
            }
          }
          
          console.log('Final column indices:', { dateColumnIndex, metricColumnIndex });
          console.log('Metric name:', metricName);
          console.log('All detected metrics:', detectedMetrics);
          
          if (dateColumnIndex === -1) {
            reject(new Error(`Could not find "Date" column. Available headers: ${headerRow.join(', ')}`));
            return;
          }
          
          if (metricColumnIndex === -1) {
            reject(new Error(`Could not find metric column. Available headers: ${headerRow.join(', ')}`));
            return;
          }
          
          const data: DataPoint[] = [];
          
          // Process data rows
          for (let i = dataStartIndex; i < results.data.length; i++) {
            const row = results.data[i] as string[];
            
            if (!row || row.length === 0) continue;
            
            const dateValue = row[dateColumnIndex]?.toString().trim();
            const metricValue = row[metricColumnIndex]?.toString().trim();
            
            console.log(`Row ${i}:`, { dateValue, metricValue });
            
            // Skip rows that don't have proper data
            if (!dateValue || !metricValue || 
                dateValue === '' || metricValue === '' ||
                dateValue.toLowerCase().includes('total') ||
                dateValue.toLowerCase().includes('grand') ||
                metricValue.toLowerCase().includes('total') ||
                metricValue.toLowerCase().includes('grand') ||
                dateValue.toLowerCase() === 'date') { // Skip if it's another header row
              continue;
            }
            
            const date = formatDate(dateValue);
            const value = parseFloat(metricValue.replace(/[,\s]/g, ''));
            
            console.log('Parsed:', { date, value });
            
            if (!isNaN(value) && date && value >= 0) {
              data.push({ date, value });
            }
          }
          
          console.log('Final parsed data count:', data.length);
          console.log('Sample data:', data.slice(0, 5));
          
          // Sort by date
          data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          if (data.length === 0) {
            reject(new Error('No valid data found in CSV. Please check the format and ensure it contains date and numeric metric columns.'));
          } else {
            resolve({ 
              data, 
              metricName, 
              detectedMetrics,
              rawData: results.data as any[][],
              headerRow,
              dateColumnIndex,
              dataStartIndex
            });
          }
        } catch (error) {
          console.error('Parsing error:', error);
          reject(new Error('Failed to parse CSV data: ' + (error as Error).message));
        }
      },
      error: (error) => {
        console.error('Papa Parse error:', error);
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

// New function to reparse data with a different metric
export const reparseWithMetric = (
  rawData: any[][],
  headerRow: string[],
  dateColumnIndex: number,
  dataStartIndex: number,
  selectedMetric: string
): { data: DataPoint[]; metricName: string } => {
  console.log('Reparsing with metric:', selectedMetric);
  
  // Find the column index for the selected metric
  let metricColumnIndex = -1;
  headerRow.forEach((header, index) => {
    if (header?.toString().trim() === selectedMetric) {
      metricColumnIndex = index;
    }
  });
  
  if (metricColumnIndex === -1) {
    throw new Error(`Could not find column for metric: ${selectedMetric}`);
  }
  
  const data: DataPoint[] = [];
  
  // Process data rows with the new metric column
  for (let i = dataStartIndex; i < rawData.length; i++) {
    const row = rawData[i] as string[];
    
    if (!row || row.length === 0) continue;
    
    const dateValue = row[dateColumnIndex]?.toString().trim();
    const metricValue = row[metricColumnIndex]?.toString().trim();
    
    // Skip rows that don't have proper data
    if (!dateValue || !metricValue || 
        dateValue === '' || metricValue === '' ||
        dateValue.toLowerCase().includes('total') ||
        dateValue.toLowerCase().includes('grand') ||
        metricValue.toLowerCase().includes('total') ||
        metricValue.toLowerCase().includes('grand') ||
        dateValue.toLowerCase() === 'date') {
      continue;
    }
    
    const date = formatDate(dateValue);
    const value = parseFloat(metricValue.replace(/[,\s]/g, ''));
    
    if (!isNaN(value) && date && value >= 0) {
      data.push({ date, value });
    }
  }
  
  // Sort by date
  data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  console.log('Reparsed data count:', data.length);
  console.log('Sample reparsed data:', data.slice(0, 5));
  
  return { data, metricName: selectedMetric };
};

const formatDate = (dateString: string): string | null => {
  try {
    console.log('Formatting date:', dateString);
    
    // Handle YYYYMMDD format
    if (/^\d{8}$/.test(dateString)) {
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      const formatted = `${year}-${month}-${day}`;
      console.log('YYYYMMDD formatted to:', formatted);
      return formatted;
    }
    
    // Handle other date formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const formatted = date.toISOString().split('T')[0];
      console.log('Date formatted to:', formatted);
      return formatted;
    }
    
    console.log('Could not format date:', dateString);
    return null;
  } catch (error) {
    console.error('Date formatting error:', error);
    return null;
  }
};