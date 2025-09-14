import React, { useState } from 'react';
import { useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { DatasetSelectionModal } from './components/DatasetSelectionModal';
import { DataChart } from './components/DataChart';
import { DataTable } from './components/DataTable';
import { CurrencyInput } from './components/CurrencySelector';
import { parseCSV } from './utils/csvParser';
import { reparseWithMetric } from './utils/csvParser';
import { aggregateData } from './utils/dataAggregator';
import { formatCurrency } from './utils/currencyController';
import { Dataset, TimeView, DateRange, ColorPeriod } from './types';
import { filterDataByDateRange, getAvailableDateRange } from './utils/dateFilter.ts';
import { DateRangeFilter } from './components/DateRangeFilter';
import { PeriodColorManager } from './components/PeriodColorManager';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { DatasetController } from './components/DatasetController';
import { DatasetUnitsController } from './components/DatasetUnitsController';
import { PeriodComparisonController } from './components/PeriodComparisonController';
import { PeriodComparisonChart } from './components/PeriodComparisonChart';
import { PeriodComparisonTable } from './components/PeriodComparisonTable';
import { GA4DataFetcher } from './components/GA4DataFetcher';
import { BarChart3, Table, TrendingUp, PieChart } from 'lucide-react';
import { Footer } from './components/Footer';
import { GraphGroup } from './types';

function App() {
  // Dynamic datasets - start with one empty slot
  const [datasets, setDatasets] = useState<Dataset[]>([
    { label: 'Dataset 1', data: [], color: '#3B82F6', metricName: 'Value', unit: 'SAR' }
  ]);
  
  // GA4 datasets state
  const [ga4Datasets, setGA4Datasets] = useState<Dataset[]>([]);
  
  const [fileNames, setFileNames] = useState<string[]>(['']);
  const [detectedMetrics, setDetectedMetrics] = useState<string[][]>([[]]);
  const [rawDataCache, setRawDataCache] = useState<Map<number, {
    rawData: any[][];
    headerRow: string[];
    dateColumnIndex: number;
    dataStartIndex: number;
  }>>(new Map());
  const [visibleDatasets, setVisibleDatasets] = useState<boolean[]>([true]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'analytics'>('chart');
  const [timeView, setTimeView] = useState<TimeView>('daily');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showGA4Fetcher, setShowGA4Fetcher] = useState<boolean>(false);
  const [isGA4Connected, setIsGA4Connected] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: ''
  });
  const [colorPeriods, setColorPeriods] = useState<ColorPeriod[]>([]);
  const [alignmentDates, setAlignmentDates] = useState<string[]>(['']);
  const [graphGroups, setGraphGroups] = useState<GraphGroup[]>([
    { id: 'main', name: 'Main Graph', datasetIndices: [] }
  ]);
  const [activeGraphId, setActiveGraphId] = useState<string>('main');
  const [showDatasetModal, setShowDatasetModal] = useState<boolean>(false);
  const [pendingFileInfo, setPendingFileInfo] = useState<{ file: File; index: number } | null>(null);

  // Color palette for new datasets
  const COLOR_PALETTE = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
    '#84CC16', '#F97316', '#EC4899', '#6366F1', '#14B8A6', '#F59E0B',
    '#DC2626', '#7C3AED', '#0891B2', '#059669', '#D97706', '#BE185D'
  ];

  // Add new dataset slot
  const addNewDatasetSlot = () => {
    const newIndex = datasets.length;
    const newDataset: Dataset = {
      label: `Dataset ${newIndex + 1}`,
      data: [],
      color: COLOR_PALETTE[newIndex % COLOR_PALETTE.length],
      metricName: 'Value',
      unit: 'SAR'
    };
    
    setDatasets(prev => [...prev, newDataset]);
    setFileNames(prev => [...prev, '']);
    setVisibleDatasets(prev => [...prev, true]);
    setAlignmentDates(prev => [...prev, '']);
    setDetectedMetrics(prev => [...prev, []]);
  };
  // Function to detect if datasets have non-overlapping time periods
  const detectNonOverlappingPeriods = (datasets: Dataset[]) => {
    if (datasets.length < 2) return false;
    
    const dateRanges = datasets.map(dataset => {
      if (dataset.data.length === 0) return null;
      const dates = dataset.data.map(point => new Date(point.date)).sort((a, b) => a.getTime() - b.getTime());
      return {
        start: dates[0],
        end: dates[dates.length - 1]
      };
    }).filter(range => range !== null);
    
    if (dateRanges.length < 2) return false;
    
    // Check if any two datasets have overlapping periods
    for (let i = 0; i < dateRanges.length; i++) {
      for (let j = i + 1; j < dateRanges.length; j++) {
        const range1 = dateRanges[i];
        const range2 = dateRanges[j];
        
        // Check for overlap: range1.start <= range2.end && range2.start <= range1.end
        const hasOverlap = range1.start <= range2.end && range2.start <= range1.end;
        
        if (hasOverlap) {
          // Calculate overlap percentage
          const overlapStart = new Date(Math.max(range1.start.getTime(), range2.start.getTime()));
          const overlapEnd = new Date(Math.min(range1.end.getTime(), range2.end.getTime()));
          const overlapDays = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
          
          const range1Days = (range1.end.getTime() - range1.start.getTime()) / (1000 * 60 * 60 * 24);
          const range2Days = (range2.end.getTime() - range2.start.getTime()) / (1000 * 60 * 60 * 24);
          
          const overlapPercentage = overlapDays / Math.min(range1Days, range2Days);
          
          // If overlap is less than 20%, consider them non-overlapping
          if (overlapPercentage < 0.2) {
            return true;
          }
        } else {
          return true; // No overlap at all
        }
      }
    }
    
    return false;
  };

  // Auto-set alignment dates for non-overlapping periods
  const autoSetAlignmentDates = (datasets: Dataset[]) => {
    const newAlignmentDates = [...alignmentDates];
    
    datasets.forEach((dataset, index) => {
      if (dataset.data.length > 0) {
        const dates = dataset.data.map(point => new Date(point.date)).sort((a, b) => a.getTime() - b.getTime());
        newAlignmentDates[index] = dates[0].toISOString().split('T')[0];
      }
    });
    
    setAlignmentDates(newAlignmentDates);
  };

  const handleFileSelect = async (file: File, index: number) => {
    // Check if this is the first dataset or if we should show the modal
    const hasExistingData = datasets.some(d => d.data.length > 0);
    
    if (hasExistingData) {
      setPendingFileInfo({ file, index });
      setShowDatasetModal(true);
      return;
    }
    
    // If no existing data, proceed normally
    await processFileUpload(file, index, 'main');
  };

  const processFileUpload = async (file: File, index: number, mode: 'main' | 'new' | string) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await parseCSV(file);
      
      // Cache the raw data for metric switching
      setRawDataCache(prev => {
        const newCache = new Map(prev);
        newCache.set(index, {
          rawData: result.rawData,
          headerRow: result.headerRow,
          dateColumnIndex: result.dateColumnIndex,
          dataStartIndex: result.dataStartIndex
        });
        return newCache;
      });
      
      setDatasets(prev => prev.map((dataset, i) => 
        i === index 
          ? { ...dataset, data: result.data, metricName: result.metricName }
          : dataset
      ));
      
      setFileNames(prev => prev.map((name, i) => i === index ? file.name : name));
      setDetectedMetrics(prev => prev.map((metrics, i) => i === index ? result.detectedMetrics : metrics));
      
      // Auto-enable visibility for newly loaded dataset
      setVisibleDatasets(prev => prev.map((visible, i) => i === index ? true : visible));
      
      if (mode === 'new') {
        // Create new graph group
        const newGraphId = `graph-${Date.now()}`;
        setGraphGroups(prev => [...prev, {
          id: newGraphId,
          name: `Graph ${prev.length + 1}`,
          datasetIndices: [index]
        }]);
        setActiveGraphId(newGraphId);
      } else if (mode === 'main') {
        // Add to main graph group
        setGraphGroups(prev => prev.map(group => 
          group.id === 'main'
            ? { ...group, datasetIndices: [...group.datasetIndices, index] }
            : group
        ));
      } else {
        // Add to specific graph group (mode contains the graph ID)
        setGraphGroups(prev => prev.map(group => 
          group.id === mode 
            ? { ...group, datasetIndices: [...group.datasetIndices, index] }
            : group
        ));
        setActiveGraphId(mode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    } finally {
      setLoading(false);
    }
  };

  const handleModalSelection = async (mode: 'main' | 'new' | string) => {
    if (pendingFileInfo) {
      await processFileUpload(pendingFileInfo.file, pendingFileInfo.index, mode);
      setPendingFileInfo(null);
    } else if (pendingGA4Data) {
      processGA4Data(pendingGA4Data.data, pendingGA4Data.metadata, mode);
      setPendingGA4Data(null);
    }
    setShowDatasetModal(false);
  };

  const handleClearFile = (index: number) => {
    setDatasets(prev => prev.map((dataset, i) => 
      i === index 
        ? { 
            ...dataset, 
            data: [], 
            metricName: 'Value',
            label: `Dataset ${i + 1}` // Reset label when clearing
          }
        : dataset
    ));
    setFileNames(prev => prev.map((name, i) => i === index ? '' : name));
    setDetectedMetrics(prev => prev.map((metrics, i) => i === index ? [] : metrics));
    setVisibleDatasets(prev => prev.map((visible, i) => i === index ? false : visible));
    
    // Clear cached raw data
    setRawDataCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(index);
      return newCache;
    });
  };

  // Handle GA4 data fetching
  const handleGA4DataFetched = (data: any[], metadata: any) => {
    console.log('GA4 Data received:', data, metadata);
    
    // Check if this is a GA4 dataset with different date range
    const hasExistingData = [...datasets, ...ga4Datasets].some(d => d.data.length > 0);
    
    if (hasExistingData) {
      // Check date overlap with existing data
      const existingDateRanges = [...datasets, ...ga4Datasets]
        .filter(d => d.data.length > 0)
        .map(d => {
          const dates = d.data.map(point => new Date(point.date)).sort((a, b) => a.getTime() - b.getTime());
          return {
            start: dates[0],
            end: dates[dates.length - 1]
          };
        });
      
      const newDataDates = data.map(row => new Date(row.date || new Date())).sort((a, b) => a.getTime() - b.getTime());
      const newDateRange = {
        start: newDataDates[0],
        end: newDataDates[newDataDates.length - 1]
      };
      
      // Check for overlap
      const hasOverlap = existingDateRanges.some(range => {
        const overlapStart = new Date(Math.max(range.start.getTime(), newDateRange.start.getTime()));
        const overlapEnd = new Date(Math.min(range.end.getTime(), newDateRange.end.getTime()));
        const overlapDays = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
        
        const range1Days = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24);
        const newRangeDays = (newDateRange.end.getTime() - newDateRange.start.getTime()) / (1000 * 60 * 60 * 24);
        
        const overlapPercentage = overlapDays / Math.min(range1Days, newRangeDays);
        return overlapPercentage >= 0.2; // 20% overlap threshold
      });
      
      if (!hasOverlap) {
        // Show modal for non-overlapping dates
        setPendingGA4Data({ data, metadata });
        setShowDatasetModal(true);
        return;
      }
    }
    
    // Process GA4 data normally
    processGA4Data(data, metadata, 'main');
  };
  
  const [pendingGA4Data, setPendingGA4Data] = useState<{ data: any[], metadata: any } | null>(null);
  
  const processGA4Data = (data: any[], metadata: any, mode: 'main' | 'new' | string) => {
    console.log('Processing GA4 data:', { data, metadata, mode });
    
    // Transform GA4 data to match our DataPoint interface
    const transformedData = data.map(row => ({
      date: row.date || new Date().toISOString().split('T')[0],
      value: parseFloat(row[metadata.metricHeaders?.[0]] || row.value || 0)
    }));

    console.log('Transformed GA4 data:', transformedData);

    // Calculate the new dataset index BEFORE adding to GA4 datasets
    const newDatasetIndex = datasets.length + ga4Datasets.length;
    console.log('New GA4 dataset will have index:', newDatasetIndex);

    // Create a new dataset from GA4 data
    const ga4Dataset: Dataset = {
      label: metadata.ga4Dataset?.label || `GA4: ${metadata.metricHeaders[0]}`,
      data: transformedData,
      color: metadata.ga4Dataset?.color || COLOR_PALETTE[(datasets.length + ga4Datasets.length) % COLOR_PALETTE.length],
      metricName: metadata.metricHeaders[0] || 'GA4 Metric',
      unit: metadata.metricHeaders[0]?.includes('Revenue') ? 'USD' : 'count'
    };

    console.log('Created GA4 dataset:', ga4Dataset);

    // Update visibility and alignment arrays BEFORE adding the dataset
    setVisibleDatasets(prev => {
      const newVisibility = [...prev];
      // Ensure array is long enough for the new index
      while (newVisibility.length <= newDatasetIndex) {
        newVisibility.push(false);
      }
      newVisibility[newDatasetIndex] = true;
      console.log('Updated visibility array:', newVisibility);
      return newVisibility;
    });
    
    setAlignmentDates(prev => {
      const newAlignmentDates = [...prev];
      // Ensure array is long enough for the new index
      while (newAlignmentDates.length <= newDatasetIndex) {
        newAlignmentDates.push('');
      }
      console.log('Updated alignment dates array:', newAlignmentDates);
      return newAlignmentDates;
    });
    // Add to GA4 datasets
    setGA4Datasets(prev => {
      const newGA4Datasets = [...prev, ga4Dataset];
      console.log('Updated GA4 datasets:', newGA4Datasets);
      return newGA4Datasets;
    });


    if (mode === 'new') {
      // Create new graph group
      const newGraphId = `graph-${Date.now()}`;
      setGraphGroups(prev => [...prev, {
        id: newGraphId,
        name: `GA4 Graph ${prev.length}`,
        datasetIndices: [newDatasetIndex]
      }]);
      setActiveGraphId(newGraphId);
    } else if (mode === 'main') {
      // Add to main datasets
      setGraphGroups(prev => prev.map(group => 
        group.id === 'main'
          ? { ...group, datasetIndices: [...group.datasetIndices, newDatasetIndex] }
          : group
      ));
    } else {
      // Add to specific graph group
      setGraphGroups(prev => prev.map(group => 
        group.id === mode 
          ? { ...group, datasetIndices: [...group.datasetIndices, newDatasetIndex] }
          : group
      ));
      setActiveGraphId(mode);
    }
  };

  // Handle GA4 connection toggle
  const handleGA4ConnectionToggle = (isConnected: boolean) => {
    setIsGA4Connected(isConnected);
    if (!isConnected) {
      setShowGA4Fetcher(false);
    }
  };

  // Remove empty dataset slots (except keep at least one)
  const removeEmptyDatasetSlot = (index: number) => {
    if (datasets.length > 1 && !datasets[index].data.length) {
      setDatasets(prev => prev.filter((_, i) => i !== index));
      setFileNames(prev => prev.filter((_, i) => i !== index));
      setVisibleDatasets(prev => prev.filter((_, i) => i !== index));
      setAlignmentDates(prev => prev.filter((_, i) => i !== index));
      setDetectedMetrics(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleLineNameChange = (name: string, index: number) => {
    setDatasets(prev => prev.map((dataset, i) => 
      i === index ? { ...dataset, label: name } : dataset
    ));
  };

  const handleMetricNameChange = (name: string, index: number) => {
    const cachedData = rawDataCache.get(index);
    const detectedMetricsForDataset = detectedMetrics[index] || [];
    
    console.log('handleMetricNameChange called:', { name, index, cachedData: !!cachedData, detectedMetrics: detectedMetricsForDataset });
    
    // Check if this is a detected metric that requires data switching
    if (cachedData && detectedMetricsForDataset.includes(name)) {
      console.log('Switching to detected metric:', name);
      try {
        const result = reparseWithMetric(
          cachedData.rawData,
          cachedData.headerRow,
          cachedData.dateColumnIndex,
          cachedData.dataStartIndex,
          name
        );
        
        // Update dataset with new data and metric name
        setDatasets(prev => prev.map((dataset, i) => 
          i === index ? { ...dataset, data: result.data, metricName: result.metricName } : dataset
        ));
        
        console.log('Switched to metric:', name, 'New data points:', result.data.length);
        console.log('Sample new data:', result.data.slice(0, 3));
      } catch (error) {
        console.error('Error switching metric:', error);
        // Fallback to just changing the name
        setDatasets(prev => prev.map((dataset, i) => 
          i === index ? { ...dataset, metricName: name } : dataset
        ));
      }
    } else {
      console.log('Using custom metric name (no data switch):', name);
      // Just update the metric name (custom text input)
      setDatasets(prev => prev.map((dataset, i) => 
        i === index ? { ...dataset, metricName: name } : dataset
      ));
    }
  };

  const handleDatasetUpdate = (index: number, updates: Partial<Dataset>) => {
    const allDatasets = [...datasets, ...ga4Datasets];
    if (index < datasets.length) {
      // Update CSV dataset
      setDatasets(prev => prev.map((dataset, i) => 
        i === index ? { ...dataset, ...updates } : dataset
      ));
    } else {
      // Update GA4 dataset
      const ga4Index = index - datasets.length;
      setGA4Datasets(prev => prev.map((dataset, i) => 
        i === ga4Index ? { ...dataset, ...updates } : dataset
      ));
    }
  };

  const handleAlignmentDateChange = (index: number, date: string) => {
    setAlignmentDates(prev => prev.map((d, i) => i === index ? date : d));
  };

  // Get current graph's datasets
  const currentGraph = graphGroups.find(g => g.id === activeGraphId);
  const currentDatasetIndices = currentGraph?.datasetIndices || [];
  
  // Combine CSV and GA4 datasets for current graph
  const allDatasets = [...datasets, ...ga4Datasets];
  console.log('All datasets:', allDatasets.length, 'Visible datasets array length:', visibleDatasets.length);
  
  const currentDatasets = currentDatasetIndices
    .filter(i => typeof i === 'number' && i >= 0 && i < allDatasets.length)
    .map(i => {
      const dataset = allDatasets[i];
      if (!dataset) {
        console.warn('Dataset at index', i, 'is undefined. Total datasets:', allDatasets.length);
        return null;
      }
      if (!dataset.data || !Array.isArray(dataset.data)) {
        console.warn('Dataset at index', i, 'has invalid data:', dataset);
        return null;
      }
      return dataset;
    })
    .filter(d => d !== null && d && d.data && Array.isArray(d.data) && d.data.length > 0);
  
  // Get visible datasets with data
  const visibleDatasetsWithData = currentDatasets.filter((d) => {
    if (!d || !d.data || !Array.isArray(d.data)) {
      console.warn('Invalid dataset structure:', d);
      return false;
    }
    const originalIndex = allDatasets.findIndex(dataset => dataset === d);
    if (originalIndex === -1) {
      console.warn('Dataset not found in allDatasets:', d?.label || 'unknown');
      return false;
    }
    if (originalIndex >= visibleDatasets.length) {
      console.warn('Dataset index', originalIndex, 'exceeds visibleDatasets length', visibleDatasets.length);
      return false;
    }
    const isVisible = visibleDatasets[originalIndex];
    if (isVisible === undefined) {
      console.warn('Visibility for dataset at index', originalIndex, 'is undefined');
      return false;
    }
    return isVisible;
  });
  
  // Detect if we should use period comparison mode
  const shouldUsePeriodComparison = detectNonOverlappingPeriods(visibleDatasetsWithData);
  
  // Auto-set alignment dates if needed
  useEffect(() => {
    if (shouldUsePeriodComparison && alignmentDates.every(date => date === '')) {
      autoSetAlignmentDates(visibleDatasetsWithData);
    }
  }, [shouldUsePeriodComparison, visibleDatasetsWithData.length]);
  
  // Filter data by date range first, then aggregate
  const filteredDatasets = (currentDatasets && Array.isArray(currentDatasets) ? currentDatasets : [])
    .filter(dataset => {
      if (!dataset || !dataset.data || !Array.isArray(dataset.data)) {
        console.warn('Filtering out invalid dataset:', dataset?.label || 'unknown');
        return false;
      }
      return true;
    })
    .map(dataset => {
      try {
        return {
          ...dataset,
          data: dateRange.startDate && dateRange.endDate 
            ? filterDataByDateRange(dataset.data, dateRange)
            : dataset.data
        };
      } catch (error) {
        console.error('Error filtering dataset:', dataset?.label, error);
        return {
          ...dataset,
          data: dataset.data || []
        };
      }
    });
  
  // Aggregate data based on selected time view
  const aggregatedDatasets = (filteredDatasets && Array.isArray(filteredDatasets) ? filteredDatasets : [])
    .filter(dataset => {
      if (!dataset || !dataset.data || !Array.isArray(dataset.data)) {
        console.warn('Filtering out invalid dataset for aggregation:', dataset?.label || 'unknown');
        return false;
      }
      return true;
    })
    .map(dataset => {
      try {
        return {
          ...dataset,
          data: aggregateData(dataset.data, timeView)
        };
      } catch (error) {
        console.error('Error aggregating dataset:', dataset?.label, error);
        return {
          ...dataset,
          data: dataset.data || []
        };
      }
    });
  
  // Get available date range from all datasets
  const availableDateRange = (() => {
    try {
      const validDatasets = currentDatasets.filter(d => d && d.data && Array.isArray(d.data));
      if (validDatasets.length === 0) {
        return null;
      }
      return getAvailableDateRange(validDatasets.map(d => d.data));
    } catch (error) {
      console.error('Error getting available date range:', error);
      return null;
    }
  })();

  // Get all datasets with data for modal logic
  const allDatasetsWithData = datasets.filter(d => d.data.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <DatasetSelectionModal
        isOpen={showDatasetModal}
        onClose={() => setShowDatasetModal(false)}
        onSelectMain={() => handleModalSelection('main')}
        onCreateNew={() => handleModalSelection('new')}
        onSelectGraph={(graphId) => handleModalSelection(graphId)}
        fileName={pendingFileInfo?.file.name || ''}
        existingGraphs={graphGroups.filter(g => g.datasetIndices.some(i => datasets[i]?.data.length > 0))}
      />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Universal Data Visualization Tool</h1>
          </div>
          <p className="text-lg text-gray-600">
            Transform your CSV data into beautiful charts and insights in seconds
          </p>
          <div className="mt-4 max-w-3xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-blue-900 mb-1">Getting Started</h3>
                  <p className="text-sm text-blue-800">
                    Upload your CSV files below. Each file should have a "Date" column and at least one numeric column. 
                    The tool automatically detects your data structure and creates visualizations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">Processing CSV file...</p>
          </div>
        )}

        {/* Getting Started Guide - Only show when no data is uploaded */}
        {allDatasetsWithData.length === 0 && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ?
                </div>
                How to Use This Tool
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold text-lg">1</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Upload CSV Files</h3>
                  <p className="text-sm text-gray-600">
                    Upload up to 6 CSV files. Each should have a "Date" column and numeric data columns.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold text-lg">2</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Customize & Filter</h3>
                  <p className="text-sm text-gray-600">
                    Set date ranges, customize units, and create color periods for deeper analysis.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold text-lg">3</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Analyze & Export</h3>
                  <p className="text-sm text-gray-600">
                    View charts, tables, and analytics. The tool automatically detects patterns and comparisons.
                  </p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
                <h4 className="font-medium text-gray-900 mb-2">📋 CSV Format Requirements:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Must have a column named "Date" (case-insensitive)</li>
                  <li>• At least one numeric column for metrics (Revenue, Sales, Count, etc.)</li>
                  <li>• Dates can be in formats like: 2024-01-15, 01/15/2024, or 20240115</li>
                  <li>• Numeric values should not contain currency symbols in the data</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* File Upload Section */}
        {!isGA4Connected && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {allDatasetsWithData.length === 0 ? '1' : '✓'}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Your Data</h2>
            {allDatasetsWithData.length > 0 && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                {allDatasetsWithData.length} file{allDatasetsWithData.length !== 1 ? 's' : ''} loaded
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((dataset, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <FileUpload
                label={`Dataset ${index + 1}`}
                fileName={fileNames[index]}
                onFileSelect={(file) => handleFileSelect(file, index)}
                onClear={() => handleClearFile(index)}
                lineName={dataset.label}
                onLineNameChange={(name) => handleLineNameChange(name, index)}
                metricName={dataset.metricName}
                onMetricNameChange={(name) => handleMetricNameChange(name, index)}
                hasData={dataset.data.length > 0}
                detectedMetrics={detectedMetrics[index] || []}
              />
              {/* Remove button for empty slots (except the first one) */}
              {index > 0 && !dataset.data.length && (
                <button
                  onClick={() => removeEmptyDatasetSlot(index)}
                  className="mt-2 w-full text-xs text-red-600 hover:text-red-800 py-1"
                >
                  Remove Slot
                </button>
              )}
            </div>
          ))}
          
          {/* Add new dataset button */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 border-dashed">
            <button
              onClick={addNewDatasetSlot}
              className="w-full h-full min-h-32 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">+</div>
                <div className="text-sm font-medium">Add Dataset</div>
              </div>
            </button>
          </div>
          </div>
        </div>
        )}

        {/* GA4 Data Fetcher */}
        <div className="mb-8">
          <GA4DataFetcher
            onDataFetched={handleGA4DataFetched}
            onConnectionToggle={handleGA4ConnectionToggle}
            existingDatasets={[...datasets, ...ga4Datasets]}
          />
        </div>

        {/* Graph Selection - Only show when multiple graphs exist */}
        {graphGroups.length > 1 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                📊
              </div>
              <h2 className="text-lg font-semibold text-gray-900">📊 Select Graph</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {graphGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setActiveGraphId(group.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeGraphId === group.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {group.name} ({group.datasetIndices.filter(i => datasets[i].data.length > 0).length})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Current Graph Data Summary */}
        {currentDatasets.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                📊
              </div>
              <h2 className="text-lg font-semibold text-gray-900">📊 Current Graph Data</h2>
              <span className="text-sm text-gray-500">
                ({currentGraph?.name || 'Main Graph'})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDatasets.map((dataset, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: dataset.color }}
                  ></div>
                  <h3 className="font-semibold text-gray-900">{dataset.label}</h3>
                </div>
                <p className="text-sm text-gray-600">
                  {dataset.data.length} data points
                </p>
                <p className="text-sm text-gray-600">
                  Total {dataset.metricName}: {formatCurrency(dataset.data.reduce((sum, point) => sum + point.value, 0), dataset.unit || 'SAR')}
                </p>
                <p className="text-xs text-gray-500">
                  {allDatasets.indexOf(dataset) >= datasets.length ? 'GA4 Dataset' : 'CSV Dataset'}
                </p>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* Visualization Controls */}
        {currentDatasets.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              3
            </div>
            <h2 className="text-lg font-semibold text-gray-900">📈 View Your Data</h2>
          </div>
          
          {/* Time View Buttons - Show for all tabs except analytics */}
          {activeTab !== 'analytics' && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">⏱️ Time View:</span>
                {shouldUsePeriodComparison && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    🤖 Affects aligned data aggregation
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTimeView('daily')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    timeView === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📅 Daily
                </button>
                <div className="hidden sm:block w-px h-8 bg-gray-300 self-center"></div>
                <span className="text-xs text-gray-500 self-center hidden sm:block">📊 Aggregation:</span>
                
                <button
                  onClick={() => setTimeView('weekly')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    timeView === 'weekly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📅 Weekly
                </button>
                <button
                  onClick={() => setTimeView('monthly')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    timeView === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📅 Monthly
                </button>
              </div>
            </div>
          )}
          
          {/* Tab Navigation */}
          <div className="bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('chart')}
                className={`flex-1 py-3 px-4 rounded-md font-medium text-sm transition-all ${
                  activeTab === 'chart'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  📊 Chart View
                </div>
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`flex-1 py-3 px-4 rounded-md font-medium text-sm transition-all ${
                  activeTab === 'table'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  📋 Table View
                </div>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex-1 py-3 px-4 rounded-md font-medium text-sm transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  📈 Analytics
                </div>
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Filters Section - Only show when data is available */}
        {currentDatasets.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                4
              </div>
              <h2 className="text-lg font-semibold text-gray-900">🎛️ Filter & Customize</h2>
              <span className="text-sm text-gray-500">(Optional)</span>
            </div>
            <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <DateRangeFilter
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                availableDateRange={availableDateRange}
              />
            </div>
            
            <PeriodColorManager
              colorPeriods={colorPeriods}
              onColorPeriodsChange={setColorPeriods}
              availableDateRange={dateRange.startDate && dateRange.endDate ? dateRange : availableDateRange}
              datasets={[...datasets, ...ga4Datasets]}
              onDatasetColorChange={(index, color) => {
                if (index < datasets.length) {
                  handleDatasetUpdate(index, { color });
                } else {
                  const ga4Index = index - datasets.length;
                  setGA4Datasets(prev => prev.map((dataset, i) => 
                    i === ga4Index ? { ...dataset, color } : dataset
                  ));
                }
              }}
            />
            </div>
          </div>
        )}

        {/* Advanced Controls Section */}
        {currentDatasets.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                5
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Advanced Controls</h2>
              <span className="text-sm text-gray-500">(Optional)</span>
            </div>
            <div className="space-y-6">
            <DatasetController
              datasets={currentDatasets}
              visibleDatasets={visibleDatasets}
              onVisibilityChange={setVisibleDatasets}
              allDatasets={allDatasets}
            />
            <DatasetUnitsController
              datasets={currentDatasets}
              onDatasetUpdate={handleDatasetUpdate}
              allDatasets={allDatasets}
            />
            </div>
          </div>
        )}

        {/* Period Alignment Controller - Show when in smart comparison mode */}
        {shouldUsePeriodComparison && currentDatasets.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                6
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Smart Period Alignment</h2>
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                Auto-detected
              </span>
            </div>
            <PeriodComparisonController
              datasets={currentDatasets}
              alignmentDates={alignmentDates}
              onAlignmentDateChange={handleAlignmentDateChange}
            />
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {/* Active Filters Display */}
          {(dateRange.startDate && dateRange.endDate) || colorPeriods.length > 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-sm font-medium text-blue-900">Active Filters</span>
              </div>
              <div className="text-sm text-blue-800 space-y-1">
                {dateRange.startDate && dateRange.endDate && (
                  <div>
                    📅 Date Range: {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
                  </div>
                )}
                {colorPeriods.length > 0 && (
                  <div>
                    🎨 Color Periods: {colorPeriods.length} custom period{colorPeriods.length !== 1 ? 's' : ''} defined
                  </div>
                )}
              </div>
            </div>
          ) : currentDatasets.length > 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-sm font-medium text-green-900">All Data Displayed</span>
              </div>
              <div className="text-sm text-green-800">
                Showing complete dataset with no filters applied
              </div>
            </div>
          ) : null}
          
          {/* Main Content Area */}
          {currentDatasets.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Visualize Your Data</h3>
                <p className="text-gray-600 mb-4">
                  Upload your first CSV file above to get started. The tool will automatically detect your data structure and create beautiful visualizations.
                </p>
                <div className="text-sm text-gray-500">
                  <p>✨ Supports multiple file formats and automatic data detection</p>
                  <p>📊 Creates charts, tables, and analytics automatically</p>
                  <p>🔍 Smart period comparison for different time ranges</p>
                </div>
              </div>
            </div>
          ) : activeTab === 'chart' ? (
            shouldUsePeriodComparison ? (
              <div className="space-y-6">
                {/* Period Comparison Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      🤖
                    </div>
                    <span className="text-sm font-medium text-blue-900">Smart Period Comparison Mode</span>
                    <span className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                      Auto-detected
                    </span>
                  </div>
                  <div className="text-sm text-blue-800">
                    <div className="mb-3">
                      🎯 <strong>Detected non-overlapping time periods</strong> in your datasets. 
                      Automatically switched to period comparison view for better analysis.
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {visibleDatasetsWithData.map((dataset, index) => {
                        const originalIndex = datasets.findIndex(d => d.label === dataset.label);
                        const alignmentDate = alignmentDates[originalIndex];
                        if (!alignmentDate) return null;
                        
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border-2 border-white"
                              style={{ backgroundColor: dataset.color }}
                            />
                            <span className="text-xs font-medium">
                              {dataset.label}: starts {new Date(alignmentDate).toLocaleDateString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <PeriodComparisonChart
                  datasets={visibleDatasetsWithData}
                  alignmentDates={alignmentDates}
                  timeView={timeView}
                  colorPeriods={colorPeriods}
                />
              </div>
            ) : (
              <DataChart
                datasets={aggregatedDatasets && Array.isArray(aggregatedDatasets) ? aggregatedDatasets.filter((_, i) => {
                  const originalIndex = allDatasets.findIndex(d => d.label === aggregatedDatasets[i].label);
                  return visibleDatasets[originalIndex];
                }) : []}
                timeView={timeView} 
                colorPeriods={colorPeriods}
              />
            )
          ) : activeTab === 'table' ? (
            shouldUsePeriodComparison ? (
              <div className="space-y-6">
                {/* Period Comparison Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      🤖
                    </div>
                    <span className="text-sm font-medium text-blue-900">Smart Period Comparison Mode</span>
                    <span className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                      Auto-detected
                    </span>
                  </div>
                  <div className="text-sm text-blue-800">
                    📋 Showing aligned timeline table for non-overlapping datasets with synchronized starting points.
                  </div>
                </div>
                
                <PeriodComparisonTable
                  datasets={visibleDatasetsWithData}
                  alignmentDates={alignmentDates}
                  timeView={timeView}
                  colorPeriods={colorPeriods}
                />
              </div>
            ) : (
              <DataTable
                datasets={aggregatedDatasets && Array.isArray(aggregatedDatasets) ? aggregatedDatasets.filter((_, i) => {
                  const originalIndex = allDatasets.findIndex(d => d.label === aggregatedDatasets[i].label);
                  return visibleDatasets[originalIndex];
                }) : []}
                timeView={timeView} 
                colorPeriods={colorPeriods}
              />
            )
          ) : (
            <AnalyticsDashboard
              datasets={currentDatasets}
              filteredDatasets={filteredDatasets}
              colorPeriods={colorPeriods}
              dateRange={dateRange}
            />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;