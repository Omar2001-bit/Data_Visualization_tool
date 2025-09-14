import React from 'react';
import { DollarSign } from 'lucide-react';
import { Dataset } from '../types';
import { formatCurrency } from '../utils/currencyController';

interface DatasetUnitsControllerProps {
  datasets: Dataset[];
  onDatasetUpdate: (index: number, updates: Partial<Dataset>) => void;
  allDatasets?: Dataset[];
}

export const DatasetUnitsController: React.FC<DatasetUnitsControllerProps> = ({
  datasets,
  onDatasetUpdate,
  allDatasets = []
}) => {
  const datasetsWithData = datasets.filter(d => d && d.data && Array.isArray(d.data) && d.data.length > 0);
  
  if (datasetsWithData.length === 0) return null;

  const handleUnitChange = (datasetIndex: number, unit: string) => {
    // Find the original index in the main datasets array
    const targetDataset = datasetsWithData[datasetIndex];
    if (!targetDataset) {
      console.warn('Target dataset not found at index:', datasetIndex);
      return;
    }
    const originalIndex = allDatasets.length > 0 
      ? allDatasets.findIndex(d => d && d === targetDataset)
      : datasets.findIndex(d => d && d === targetDataset);
    if (originalIndex === -1) {
      console.warn('Could not find original index for dataset:', targetDataset.label);
      return;
    }
    onDatasetUpdate(originalIndex, { unit });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">💰 Units & Currency</h3>
        <span className="text-sm text-gray-500">
          ({datasetsWithData.length} dataset{datasetsWithData.length !== 1 ? 's' : ''})
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Customize how your values are displayed in charts and tables
      </p>

      <div className="space-y-4">
        {datasetsWithData.map((dataset, index) => {
          const currentUnit = dataset.unit || 'SAR';
          
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
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  {currentUnit}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Unit Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💰 Unit/Currency
                  </label>
                  <input
                    type="text"
                    value={currentUnit}
                    onChange={(e) => handleUnitChange(index, e.target.value)}
                    placeholder="Enter unit (e.g., SAR, $, %, kg, units, etc.)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Examples: SAR, $, €, %, kg, lbs, hrs, days, units, count
                  </p>
                </div>

                {/* Unit Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    👀 Preview
                  </label>
                  <div className="p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded border">
                    <div className="text-xs text-gray-600 mb-1">Sample formatting:</div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(1234.56, currentUnit)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      How values will appear in charts and tables
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unit Summary */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <div className="font-medium mb-1">Active Units:</div>
          <div className="flex flex-wrap gap-2">
            {datasetsWithData.map((dataset, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-gray-100 to-blue-100 rounded text-xs font-medium"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: dataset.color }}
                />
                💰 {dataset.label}: {dataset.unit || 'SAR'}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};