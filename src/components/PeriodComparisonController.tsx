import React from 'react';
import { Calendar, AlignLeft, Info } from 'lucide-react';
import { Dataset } from '../types';

interface PeriodComparisonControllerProps {
  datasets: Dataset[];
  alignmentDates: string[];
  onAlignmentDateChange: (index: number, date: string) => void;
}

export const PeriodComparisonController: React.FC<PeriodComparisonControllerProps> = ({
  datasets,
  alignmentDates,
  onAlignmentDateChange
}) => {
  const datasetsWithData = datasets.filter(d => d && d.data && Array.isArray(d.data) && d.data.length > 0);
  
  if (datasetsWithData.length === 0) return null;

  const getDatasetDateRange = (dataset: Dataset) => {
    if (!dataset || !dataset.data || !Array.isArray(dataset.data) || dataset.data.length === 0) return null;
    
    const dates = dataset.data
      .filter(point => point && point.date)
      .map(point => new Date(point.date))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (dates.length === 0) return null;
    
    return {
      start: dates[0].toISOString().split('T')[0],
      end: dates[dates.length - 1].toISOString().split('T')[0]
    };
  };

  const setToDatasetStart = (index: number) => {
    const dataset = datasetsWithData[index];
    if (!dataset) {
      console.warn('Dataset not found at index:', index);
      return;
    }
    const dateRange = getDatasetDateRange(dataset);
    if (dateRange) {
      onAlignmentDateChange(index, dateRange.start);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <AlignLeft className="h-5 w-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Period Alignment Controller</h3>
        <span className="text-sm text-gray-500">
          ({datasetsWithData.length} dataset{datasetsWithData.length !== 1 ? 's' : ''})
        </span>
      </div>

      {/* Info Box */}
      <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-purple-800">
            <div className="font-medium mb-1">How Period Alignment Works:</div>
            <ul className="space-y-1 text-xs">
              <li>• Set an alignment date for each dataset to synchronize their starting points</li>
              <li>• All data will be displayed as "Day 0", "Day 1", etc. from the alignment date</li>
              <li>• Perfect for comparing different time periods (e.g., 2024 vs 2025, Q1 vs Q2)</li>
              <li>• Only data from the alignment date onwards will be shown</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Alignment Controls */}
      <div className="space-y-4">
        {datasetsWithData.map((dataset, index) => {
          const dateRange = getDatasetDateRange(dataset);
          const currentAlignment = alignmentDates[index] || '';
          
          return (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: dataset.color }}
                />
                <h4 className="font-medium text-gray-900">{dataset.label}</h4>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {dataset.metricName}
                </span>
                {currentAlignment && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Aligned
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Alignment Date Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alignment Date
                  </label>
                  <input
                    type="date"
                    value={currentAlignment}
                    min={dateRange?.start}
                    max={dateRange?.end}
                    onChange={(e) => onAlignmentDateChange(index, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will become "Day 0" in the comparison chart
                  </p>
                </div>

                {/* Dataset Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dataset Information
                  </label>
                  <div className="p-3 bg-gray-50 rounded border">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium">Data Range:</span> {' '}
                        {dateRange ? (
                          <>
                            {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
                          </>
                        ) : 'No data'}
                      </div>
                      <div>
                        <span className="font-medium">Total Points:</span> {dataset.data.length}
                      </div>
                      {currentAlignment && dateRange && (
                        <div>
                          <span className="font-medium">Points from alignment:</span> {' '}
                          {dataset.data.filter(point => new Date(point.date) >= new Date(currentAlignment)).length}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setToDatasetStart(index)}
                  className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                >
                  Use Dataset Start
                </button>
                <button
                  onClick={() => onAlignmentDateChange(index, '')}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Clear Alignment
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <div className="font-medium mb-1">Alignment Summary:</div>
          <div className="space-y-1">
            {datasetsWithData.map((dataset, index) => {
              const alignment = alignmentDates[index];
              return (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: dataset.color }}
                  />
                  <span className="text-xs">
                    {dataset.label}: {alignment ? new Date(alignment).toLocaleDateString() : 'Not aligned'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};