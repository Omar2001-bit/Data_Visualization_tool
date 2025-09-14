import React from 'react';
import { X, BarChart3, Plus } from 'lucide-react';
import { GraphGroup } from '../types';

interface DatasetSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMain: () => void;
  onCreateNew: () => void;
  onSelectGraph: (graphId: string) => void;
  fileName: string;
  existingGraphs: GraphGroup[];
  isGA4Data?: boolean;
}

export const DatasetSelectionModal: React.FC<DatasetSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectMain,
  onCreateNew,
  onSelectGraph,
  fileName,
  existingGraphs,
  isGA4Data = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isGA4Data ? '📊 Where should we add this GA4 data?' : `📊 Where should we add "${fileName}"?`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            {isGA4Data 
              ? 'This GA4 data has different date ranges. Choose how to visualize it:'
              : 'Choose how you want to visualize this new dataset:'
            }
          </p>
          
          <div className="space-y-4">
            {/* Existing Graphs */}
            {existingGraphs.map((graph) => (
              <button
                key={graph.id}
                onClick={() => graph.id === 'main' ? onSelectMain() : onSelectGraph(graph.id)}
                className="w-full p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">
                      Add to {graph.name}
                      {isGA4Data && graph.id === 'main' && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                          Smart Comparison
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {isGA4Data && graph.id === 'main' 
                        ? 'Enable period comparison mode with aligned timelines'
                        : `Compare with ${graph.datasetIndices.length} existing dataset${graph.datasetIndices.length !== 1 ? 's' : ''}`
                      }
                    </div>
                  </div>
                </div>
              </button>
            ))}
            
            {/* Create New Graph */}
            <button
              onClick={onCreateNew}
              className="w-full p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Plus className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">Create New Graph</div>
                  <div className="text-sm text-gray-600">
                    {isGA4Data 
                      ? 'Separate GA4 visualization with independent timeline'
                      : 'Separate visualization with its own controls'
                    }
                  </div>
                </div>
              </div>
            </button>
          </div>
          
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600">
              💡 <strong>Tip:</strong> {isGA4Data 
                ? 'Smart Comparison aligns different time periods for direct comparison (Day 1, Day 2, etc.)'
                : 'Add to existing graphs for comparisons, create new graphs for separate analysis'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};