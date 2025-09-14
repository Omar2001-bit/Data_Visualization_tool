import React from 'react';
import { formatCurrency } from '../utils/currencyController';
import { formatDateLabel, aggregateData } from '../utils/dataAggregator';
import { groupDataByColor } from '../utils/periodColorUtils';
import { Dataset, TimeView, ColorPeriod, DataPoint } from '../types';

interface PeriodComparisonTableProps {
  datasets: Dataset[];
  alignmentDates: string[];
  timeView: TimeView;
  colorPeriods: ColorPeriod[];
}

interface AlignedDataPoint {
  dayOffset: number;
  value: number;
  originalDate: string;
}

export const PeriodComparisonTable: React.FC<PeriodComparisonTableProps> = ({ 
  datasets, 
  alignmentDates,
  timeView,
  colorPeriods
}) => {
  if (datasets.length === 0 || datasets.every(d => d.data.length === 0)) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No data to display</div>
          <div className="text-sm">Upload CSV files and set alignment dates to see period comparison table</div>
        </div>
      </div>
    );
  }

  // Function to align data based on alignment dates
  const alignDatasets = () => {
    return datasets.flatMap((dataset, index) => {
      const alignmentDate = alignmentDates[index];
      if (!alignmentDate || dataset.data.length === 0) {
        return [];
      }

      // First aggregate the data based on timeView
      const aggregatedData = aggregateData(dataset.data, timeView);

      if (colorPeriods.length === 0) {
        // No color periods, use original dataset
        const alignmentDateObj = new Date(alignmentDate);
        const alignedData: AlignedDataPoint[] = aggregatedData
          .map(point => {
            const pointDate = new Date(point.date);
            let dayOffset: number;
            
            if (timeView === 'daily') {
              dayOffset = Math.floor((pointDate.getTime() - alignmentDateObj.getTime()) / (1000 * 60 * 60 * 24));
            } else if (timeView === 'weekly') {
              dayOffset = Math.floor((pointDate.getTime() - alignmentDateObj.getTime()) / (1000 * 60 * 60 * 24 * 7));
            } else { // monthly
              const alignmentMonth = alignmentDateObj.getFullYear() * 12 + alignmentDateObj.getMonth();
              const pointMonth = pointDate.getFullYear() * 12 + pointDate.getMonth();
              dayOffset = pointMonth - alignmentMonth;
            }
            
            return {
              dayOffset,
              value: point.value,
              originalDate: point.date
            };
          })
          .filter(point => point.dayOffset >= 0) // Only include data from alignment date onwards
          .sort((a, b) => a.dayOffset - b.dayOffset);

        return [{ ...dataset, alignedData, data: aggregatedData }];
      } else {
        // Group data by color periods
        const colorGroups = groupDataByColor(aggregatedData, colorPeriods, dataset.color);
        
        return colorGroups.map(group => {
          const alignmentDateObj = new Date(alignmentDate);
          const alignedData: AlignedDataPoint[] = group.data
            .map(point => {
              const pointDate = new Date(point.date);
              let dayOffset: number;
              
              if (timeView === 'daily') {
                dayOffset = Math.floor((pointDate.getTime() - alignmentDateObj.getTime()) / (1000 * 60 * 60 * 24));
              } else if (timeView === 'weekly') {
                dayOffset = Math.floor((pointDate.getTime() - alignmentDateObj.getTime()) / (1000 * 60 * 60 * 24 * 7));
              } else { // monthly
                const alignmentMonth = alignmentDateObj.getFullYear() * 12 + alignmentDateObj.getMonth();
                const pointMonth = pointDate.getFullYear() * 12 + pointDate.getMonth();
                dayOffset = pointMonth - alignmentMonth;
              }
              
              return {
                dayOffset,
                value: point.value,
                originalDate: point.date
              };
            })
            .filter(point => point.dayOffset >= 0) // Only include data from alignment date onwards
            .sort((a, b) => a.dayOffset - b.dayOffset);

          return {
            ...dataset,
            label: group.label ? `${dataset.label} - ${group.label}` : dataset.label,
            color: group.color,
            alignedData,
            data: group.data
          };
        });
      }
    });
  };

  const alignedDatasets = alignDatasets();
  
  // Get the maximum day offset across all datasets to determine table range
  const maxDayOffset = Math.max(
    ...alignedDatasets.map(dataset => 
      dataset.alignedData?.length > 0 
        ? Math.max(...dataset.alignedData.map(point => point.dayOffset))
        : 0
    )
  );

  // Create array of day offsets for table rows
  const periodOffsets = Array.from({ length: maxDayOffset + 1 }, (_, i) => i);
  
  const getPeriodLabel = (offset: number) => {
    if (timeView === 'daily') {
      return `Day ${offset}`;
    } else if (timeView === 'weekly') {
      return `Week ${offset}`;
    } else {
      return `Month ${offset}`;
    }
  };

  const datasetsWithData = alignedDatasets.filter(dataset => 
    dataset.alignedData && dataset.alignedData.length > 0
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Period Comparison Table (Aligned Timeline - {timeView.charAt(0).toUpperCase() + timeView.slice(1)} View)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          All datasets aligned to their respective starting dates for direct comparison
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {timeView === 'daily' ? 'Day Offset' : timeView === 'weekly' ? 'Week Offset' : 'Month Offset'}
              </th>
              {datasetsWithData.map((dataset, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: dataset.color }}
                      ></div>
                      {dataset.label}
                    </div>
                    <div className="text-xs text-gray-400 normal-case">
                      {dataset.metricName}
                      {timeView !== 'daily' && (
                        <span> | Total/Avg</span>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {periodOffsets.map((periodOffset, index) => (
              <tr key={periodOffset} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getPeriodLabel(periodOffset)}
                </td>
                {datasetsWithData.map((dataset, datasetIndex) => {
                  const point = dataset.alignedData?.find(p => p.dayOffset === periodOffset);
                  const unit = dataset.unit || 'SAR';
                  const typedPoint = point as AlignedDataPoint & { average?: number; count?: number };
                  
                  return (
                    <td
                      key={datasetIndex}
                      className="px-6 py-4 text-sm text-gray-900"
                    >
                      {point ? (
                        <div>
                          <div className="font-medium">
                            {formatCurrency(point.value, unit)}
                          </div>
                          {timeView !== 'daily' && typedPoint?.average !== undefined && (
                            <div className="text-xs text-gray-500">
                              Avg: {formatCurrency(typedPoint.average, unit)}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {timeView === 'daily' 
                              ? new Date(point.originalDate).toLocaleDateString()
                              : formatDateLabel(point.originalDate, timeView)
                            }
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Table Summary */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          <div className="font-medium mb-2">Alignment Summary:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasetsWithData.map((dataset, index) => {
              const originalIndex = datasets.indexOf(dataset);
              const alignmentDate = alignmentDates[originalIndex];
              const dataPoints = dataset.alignedData?.length || 0;
              
              return (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: dataset.color }}
                  />
                  <div className="text-xs">
                    <div className="font-medium">{dataset.label}</div>
                    <div>Start: {new Date(alignmentDate).toLocaleDateString()}</div>
                    <div>{dataPoints} aligned data points</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};