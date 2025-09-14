import React from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Dataset } from '../types';

interface DatasetControllerProps {
  datasets: Dataset[];
  visibleDatasets: boolean[];
  onVisibilityChange: (visibility: boolean[]) => void;
  allDatasets?: Dataset[];
}

export const DatasetController: React.FC<DatasetControllerProps> = ({
  datasets,
  visibleDatasets,
  onVisibilityChange,
  allDatasets = []
}) => {
  const datasetsWithData = datasets.filter(d => d && d.data && Array.isArray(d.data) && d.data.length > 0);
  
  if (datasetsWithData.length === 0) return null;

  // Group datasets by metric name
  const metricGroups = datasetsWithData.reduce((groups, dataset) => {
    if (!dataset || !dataset.metricName) {
      console.warn('Dataset missing metricName:', dataset);
      return groups;
    }
    const metricName = dataset.metricName;
    if (!groups[metricName]) {
      groups[metricName] = [];
    }
    const originalIndex = datasets.findIndex(d => d === dataset);
    if (originalIndex !== -1) {
      groups[metricName].push({ dataset, originalIndex });
    }
    return groups;
  }, {} as Record<string, Array<{ dataset: Dataset; originalIndex: number }>>);

  const metricNames = Object.keys(metricGroups);
  
  // Check current visibility constraints
  const getVisibilityConstraints = () => {
    const visibleMetrics = new Set<string>();
    const visibleCounts: Record<string, number> = {};
    
    datasetsWithData.forEach((dataset, index) => {
      const originalIndex = datasets.indexOf(dataset);
      if (visibleDatasets[originalIndex]) {
        visibleMetrics.add(dataset.metricName);
        visibleCounts[dataset.metricName] = (visibleCounts[dataset.metricName] || 0) + 1;
      }
    });
    
    return { visibleMetrics, visibleCounts };
  };

  const { visibleMetrics, visibleCounts } = getVisibilityConstraints();

  const canToggleDataset = (dataset: Dataset, originalIndex: number, isCurrentlyVisible: boolean) => {
    if (isCurrentlyVisible) {
      // Can always hide a dataset
      return true;
    }
    
    // Trying to show a dataset
    const metricName = dataset.metricName;
    
    if (visibleMetrics.has(metricName)) {
      // Same metric - unlimited
      return true;
    } else {
      // Different metric - check if we already have 2 different metrics
      if (visibleMetrics.size >= 2) {
        return false;
      }
      return true;
    }
  };

  const toggleDatasetVisibility = (originalIndex: number) => {
    const newVisibility = [...visibleDatasets];
    const dataset = allDatasets.length > 0 ? allDatasets[originalIndex] : datasets[originalIndex];
    const isCurrentlyVisible = visibleDatasets[originalIndex];
    
    if (canToggleDataset(dataset, originalIndex, isCurrentlyVisible)) {
      newVisibility[originalIndex] = !isCurrentlyVisible;
      onVisibilityChange(newVisibility);
    }
  };

  const toggleAllInMetric = (metricName: string, show: boolean) => {
    const newVisibility = [...visibleDatasets];
    
    if (show) {
      // Check if we can show this metric
      if (visibleMetrics.size >= 2 && !visibleMetrics.has(metricName)) {
        return; // Can't add a third metric type
      }
      
      metricGroups[metricName].forEach(({ originalIndex }) => {
        newVisibility[originalIndex] = true;
      });
    } else {
      metricGroups[metricName].forEach(({ originalIndex }) => {
        newVisibility[originalIndex] = false;
      });
    }
    
    onVisibilityChange(newVisibility);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">👁️ Dataset Visibility</h3>
        <span className="text-sm text-gray-500">
          ({Object.values(visibleCounts).reduce((sum, count) => sum + count, 0)} visible)
        </span>
      </div>

      {/* Constraint Information */}
      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5 flex-shrink-0">
            ℹ️
          </div>
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">📋 How Visibility Works:</div>
            <ul className="space-y-1 text-xs">
              <li>✅ <strong>Same metric:</strong> Show unlimited datasets simultaneously</li>
              <li>⚖️ <strong>Different metrics:</strong> Maximum 2 types (dual Y-axis)</li>
              <li>📊 <strong>Currently active:</strong> {visibleMetrics.size} metric type{visibleMetrics.size !== 1 ? 's' : ''}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Metric Groups */}
      <div className="space-y-4">
        {metricNames.map(metricName => {
          const group = metricGroups[metricName];
          const visibleInGroup = group.filter(({ originalIndex }) => visibleDatasets[originalIndex]).length;
          const totalInGroup = group.length;
          const isMetricVisible = visibleCounts[metricName] > 0;
          const canShowMetric = visibleMetrics.size < 2 || visibleMetrics.has(metricName);

          return (
            <div key={metricName} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{metricName}</h4>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {visibleInGroup}/{totalInGroup} visible
                  </span>
                  {isMetricVisible && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      ✓ Active
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAllInMetric(metricName, true)}
                    disabled={!canShowMetric}
                    className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                      canShowMetric
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 shadow-sm'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    👁️ Show All
                  </button>
                  <button
                    onClick={() => toggleAllInMetric(metricName, false)}
                    className="text-xs px-3 py-1 rounded-md font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors shadow-sm"
                  >
                    🙈 Hide All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {group.map(({ dataset, originalIndex }) => {
                  const isVisible = visibleDatasets[originalIndex];
                  const canToggle = canToggleDataset(dataset, originalIndex, isVisible);

                  return (
                    <div
                      key={originalIndex}
                      className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
                        isVisible
                          ? 'bg-green-50 border-green-200'
                          : canToggle
                          ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          : 'bg-red-50 border-red-200'
                      }`}
                      title={isVisible ? 'Hide dataset' : canToggle ? 'Show dataset' : 'Cannot show - metric limit reached'}
                    >
                      <button
                        onClick={() => toggleDatasetVisibility(originalIndex)}
                        disabled={!canToggle && !isVisible}
                        className={`p-1 rounded transition-colors ${
                          isVisible
                            ? 'text-green-600 hover:bg-green-200'
                            : canToggle
                            ? 'text-gray-600 hover:bg-gray-200'
                            : 'text-red-400 cursor-not-allowed'
                        }`}
                      >
                        {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dataset.color }}
                      />
                      <span className={`text-sm font-medium flex-1 ${
                        isVisible ? 'text-green-800' : canToggle ? 'text-gray-700' : 'text-red-600'
                      }`}>
                        {dataset.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {dataset.data.length} pts
                      </span>
                      {!canToggle && !isVisible && (
                        <span className="text-xs text-red-600 font-medium">
                          ⚠️ Limit reached
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            📊 Showing {Object.values(visibleCounts).reduce((sum, count) => sum + count, 0)} of {datasetsWithData.length} datasets
          </div>
          <div className="text-gray-600">
            📈 {visibleMetrics.size} metric type{visibleMetrics.size !== 1 ? 's' : ''}: {Array.from(visibleMetrics).join(', ')}
          </div>
        </div>
      </div>
    </div>
  );
};