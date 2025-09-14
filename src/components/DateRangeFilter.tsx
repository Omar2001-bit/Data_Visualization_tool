import React from 'react';
import { Calendar } from 'lucide-react';
import { DateRange } from '../types';

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
  availableDateRange?: DateRange;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateRange,
  onDateRangeChange,
  availableDateRange
}) => {
  const handleStartDateChange = (date: string) => {
    onDateRangeChange({
      ...dateRange,
      startDate: date
    });
  };

  const handleEndDateChange = (date: string) => {
    onDateRangeChange({
      ...dateRange,
      endDate: date
    });
  };

  const resetToFullRange = () => {
    onDateRangeChange({ startDate: '', endDate: '' });
  };

  const setToFullRange = () => {
    if (availableDateRange) {
      onDateRangeChange(availableDateRange);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900">📅 Date Range Filter</h3>
        {dateRange.startDate && dateRange.endDate && (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            ✓ Active
          </span>
        )}
      </div>
      
      <p className="text-xs text-gray-600 mb-3">
        Filter your data to focus on specific time periods
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            📅 Start Date
          </label>
          <input
            type="date"
            value={dateRange.startDate}
            min={availableDateRange?.startDate}
            max={availableDateRange?.endDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            📅 End Date
          </label>
          <input
            type="date"
            value={dateRange.endDate}
            min={availableDateRange?.startDate}
            max={availableDateRange?.endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {availableDateRange && (
        <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
            📊 Available data: {new Date(availableDateRange.startDate).toLocaleDateString()} - {new Date(availableDateRange.endDate).toLocaleDateString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={setToFullRange}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
            >
              📊 Use Full Range
            </button>
            {(dateRange.startDate || dateRange.endDate) && (
              <button
                onClick={resetToFullRange}
                className="text-xs text-gray-600 hover:text-gray-800 font-medium bg-gray-50 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                🗑️ Clear Filter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};