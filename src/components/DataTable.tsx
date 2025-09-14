import React from 'react';
import { formatDateLabel } from '../utils/dataAggregator';
import { formatCurrency } from '../utils/currencyController';
import { groupDataByColor } from '../utils/periodColorUtils';
import { Dataset, TimeView, ColorPeriod, DataPoint } from '../types';

interface DataTableProps {
  datasets: Dataset[];
  timeView: TimeView;
  colorPeriods: ColorPeriod[];
}

export const DataTable: React.FC<DataTableProps> = ({ datasets, timeView, colorPeriods }) => {
  if (!datasets || datasets.length === 0 || datasets.every(d => !d || !d.data || !Array.isArray(d.data) || d.data.length === 0)) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No data to display</div>
          <div className="text-sm">Upload CSV files to see your data table</div>
        </div>
      </div>
    );
  }

  // Get all unique dates from all datasets
  const allDates = Array.from(
    new Set(datasets
      .filter(d => d && d.data && Array.isArray(d.data))
      .flatMap(d => d.data.map(point => point && point.date ? point.date : ''))
      .filter(date => date !== '')
    )
  ).sort();
  
  // Prepare datasets with color grouping
  const processedDatasets = datasets
    .filter(dataset => dataset && dataset.data && Array.isArray(dataset.data))
    .flatMap(dataset => {
    if (colorPeriods.length === 0) {
      return [dataset];
    } else {
      const colorGroups = groupDataByColor(dataset.data, colorPeriods, dataset.color);
      return colorGroups.map(group => ({
        ...dataset,
        label: group.label ? `${dataset.label} - ${group.label}` : dataset.label,
        data: group.data,
        color: group.color
      }));
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Data Table ({timeView.charAt(0).toUpperCase() + timeView.slice(1)} View)
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              {processedDatasets.map((dataset, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: dataset.color }}
                    ></div>
                    {dataset.label}
                    <span className="text-xs text-gray-400">({dataset.metricName})</span>
                    {timeView !== 'daily' && (
                      <span className="text-xs text-gray-400">Total/Avg</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allDates.map((date, index) => (
              <tr key={date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatDateLabel(date, timeView)}
                </td>
                {processedDatasets.map((dataset, datasetIndex) => {
                  const point = dataset.data.find(p => p.date === date);
                  const unit = dataset.unit || 'SAR';
                  const typedPoint = point as DataPoint & { average?: number; count?: number };
                  
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
    </div>
  );
};