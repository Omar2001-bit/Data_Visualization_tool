import React from 'react';
import { Upload, X, ChevronDown } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  fileName?: string;
  onClear: () => void;
  label: string;
  lineName: string;
  onLineNameChange: (name: string) => void;
  metricName: string;
  onMetricNameChange: (name: string) => void;
  accept?: string;
  hasData?: boolean;
  detectedMetrics?: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  fileName,
  onClear,
  label,
  lineName,
  onLineNameChange,
  metricName,
  onMetricNameChange,
  accept = '.csv',
  hasData = false,
  detectedMetrics = []
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isCustomInput, setIsCustomInput] = React.useState(false);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };
  
  const handleMetricSelect = (selectedMetric: string) => {
    console.log('Metric selected from dropdown:', selectedMetric);
    onMetricNameChange(selectedMetric);
    setIsDropdownOpen(false);
    setIsCustomInput(false);
  };
  
  const handleCustomInput = () => {
    setIsCustomInput(true);
    setIsDropdownOpen(false);
  };
  
  const hasDetectedMetrics = detectedMetrics.length > 0;

  return (
    <div className="space-y-4 h-full">
      {/* Dataset Status Indicator */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
        {hasData && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
            ✓ Loaded
          </span>
        )}
      </div>
      
      <div>
        <div className="relative">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={`file-${label}`}
          />
          <label
            htmlFor={`file-${label}`}
            className={`flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
              hasData 
                ? 'border-green-300 bg-green-50 hover:border-green-400 hover:bg-green-100' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <div className="text-center">
              <Upload className={`mx-auto h-8 w-8 mb-2 ${
                hasData ? 'text-green-500' : 'text-gray-400'
              }`} />
              <p className={`text-sm ${
                hasData ? 'text-green-700 font-medium' : 'text-gray-600'
              }`}>
                {fileName ? (
                  <span className="flex items-center gap-1">
                    {hasData && '✓'} {fileName}
                  </span>
                ) : (
                  <>
                    <span className="font-medium">Click to upload CSV file</span>
                    <br />
                    <span className="text-xs text-gray-500 mt-1">
                      Must contain "Date" column + numeric data
                    </span>
                  </>
                )}
              </p>
            </div>
          </label>
          {fileName && (
            <button
              onClick={onClear}
              className="absolute top-2 right-2 p-1 bg-red-100 rounded-full hover:bg-red-200 transition-colors duration-200 shadow-sm"
              title="Remove file"
            >
              <X className="h-4 w-4 text-red-600" />
            </button>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Display Name
        </label>
        <input
          type="text"
          value={lineName}
          onChange={(e) => onLineNameChange(e.target.value)}
          placeholder="e.g., Q1 Sales, Website Traffic, etc."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          This name will appear in charts and legends
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Metric Type
          {hasDetectedMetrics && (
            <span className="ml-1 text-xs text-green-600 font-medium">
              ({detectedMetrics.length} detected)
            </span>
          )}
        </label>
        
        {hasDetectedMetrics && !isCustomInput ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between"
            >
              <span className={metricName ? 'text-gray-900' : 'text-gray-500'}>
                {metricName || 'Select a metric...'}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {detectedMetrics.map((metric, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleMetricSelect(metric)}
                    className={`w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                      metricName === metric ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{metric}</span>
                      {metricName === metric && (
                        <span className="text-blue-600 text-xs">✓ Selected</span>
                      )}
                    </div>
                  </button>
                ))}
                <div className="border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCustomInput}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-gray-600 text-sm"
                  >
                    ✏️ Enter custom metric name...
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={metricName}
              onChange={(e) => onMetricNameChange(e.target.value)}
              placeholder="e.g., Revenue, Sales, Visits, Users, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {hasDetectedMetrics && isCustomInput && (
              <button
                type="button"
                onClick={() => setIsCustomInput(false)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to detected metrics
              </button>
            )}
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-1">
          {hasDetectedMetrics 
            ? 'Select from detected metrics (switches data) or enter custom name'
            : 'Describes what this data measures (auto-detected from CSV)'
          }
        </p>
      </div>
    </div>
  );
};