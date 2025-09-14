import React from 'react';
import { TrendingUp, TrendingDown, BarChart3, Calculator, Calendar, Palette } from 'lucide-react';
import { Dataset, ColorPeriod, DateRange } from '../types';
import { formatCurrency } from '../utils/currencyController';
import { filterDataByDateRange } from '../utils/dateFilter';
import { groupDataByColor } from '../utils/periodColorUtils';

interface AnalyticsDashboardProps {
  datasets: Dataset[];
  filteredDatasets: Dataset[];
  colorPeriods: ColorPeriod[];
  dateRange: DateRange;
}

interface AnalyticsData {
  total: number;
  average: number;
  count: number;
  label: string;
  color?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  datasets,
  filteredDatasets,
  colorPeriods,
  dateRange,
}) => {
  if (datasets.length === 0) return null;

  // Calculate CSV level analytics (original data)
  const csvAnalytics: AnalyticsData[] = datasets.map(dataset => {
    const total = dataset.data.reduce((sum, point) => sum + point.value, 0);
    const count = dataset.data.length;
    return {
      total,
      average: count > 0 ? total / count : 0,
      count,
      label: dataset.label,
      color: dataset.color
    };
  });

  // Calculate date range level analytics (filtered data)
  const dateRangeAnalytics: AnalyticsData[] = filteredDatasets.map(dataset => {
    const total = dataset.data.reduce((sum, point) => sum + point.value, 0);
    const count = dataset.data.length;
    return {
      total,
      average: count > 0 ? total / count : 0,
      count,
      label: dataset.label,
      color: dataset.color
    };
  });

  // Calculate color period analytics
  const colorPeriodAnalytics: AnalyticsData[][] = filteredDatasets.map(dataset => {
    if (colorPeriods.length === 0) return [];
    
    const colorGroups = groupDataByColor(dataset.data, colorPeriods, dataset.color);
    return colorGroups.map(group => {
      const total = group.data.reduce((sum, point) => sum + point.value, 0);
      const count = group.data.length;
      return {
        total,
        average: count > 0 ? total / count : 0,
        count,
        label: group.label ? `${dataset.label} - ${group.label}` : dataset.label,
        color: group.color
      };
    });
  });

  // Generate insights
  const generateInsights = () => {
    const insights: string[] = [];
    
    // Compare CSV vs Date Range
    csvAnalytics.forEach((csvData, index) => {
      const rangeData = dateRangeAnalytics[index];
      if (rangeData && dateRange.startDate && dateRange.endDate) {
        const avgChange = ((rangeData.average - csvData.average) / csvData.average) * 100;
        
        insights.push(
          `📊 <span class="font-medium">${csvData.label}:</span> Date range represents <span class="font-semibold">${((rangeData.count / csvData.count) * 100).toFixed(1)}%</span> of total data points`
        );
        
        if (Math.abs(avgChange) > 5) {
          const changeColor = avgChange > 0 ? 'text-green-600' : 'text-red-600';
          const changeIcon = avgChange > 0 ? '📈' : '📉';
          insights.push(
            `${changeIcon} <span class="font-medium">${csvData.label}:</span> Average in selected range is <span class="${changeColor} font-semibold">${Math.abs(avgChange).toFixed(1)}% ${avgChange > 0 ? 'higher' : 'lower'}</span> than overall average`
          );
        }
      }
    });

    // Compare color periods
    colorPeriodAnalytics.forEach((periods, datasetIndex) => {
      if (periods.length > 1) {
        const sorted = [...periods].sort((a, b) => b.average - a.average);
        const highest = sorted[0];
        const lowest = sorted[sorted.length - 1];
        
        if (highest.average !== lowest.average) {
          const difference = ((highest.average - lowest.average) / lowest.average) * 100;
          insights.push(
            `🎨 <span class="font-medium">${datasets[datasetIndex].label}:</span> "<span class="text-green-600 font-semibold">${highest.label.split(' - ')[1]}</span>" period performs <span class="text-green-600 font-semibold">${difference.toFixed(1)}% better</span> than "<span class="text-red-600 font-semibold">${lowest.label.split(' - ')[1]}</span>" period on average`
          );
        }
      }
    });

    return insights;
  };

  const insights = generateInsights();

  // Generate cross-dataset insights
  const generateCrossDatasetInsights = () => {
    const crossInsights: string[] = [];
    
    if (csvAnalytics.length >= 2) {
      // Compare totals
      const sortedByTotal = [...csvAnalytics].sort((a, b) => b.total - a.total);
      const highest = sortedByTotal[0];
      const lowest = sortedByTotal[sortedByTotal.length - 1];
      
      if (highest.total !== lowest.total) {
        const difference = ((highest.total - lowest.total) / lowest.total) * 100;
        crossInsights.push(
          `💰 "<span class="text-green-600 font-semibold">${highest.label}</span>" has <span class="text-green-600 font-semibold">${difference.toFixed(1)}% higher</span> total value than "<span class="text-red-600 font-semibold">${lowest.label}</span>"`
        );
      }
      
      // Compare averages
      const sortedByAverage = [...csvAnalytics].sort((a, b) => b.average - a.average);
      const highestAvg = sortedByAverage[0];
      const lowestAvg = sortedByAverage[sortedByAverage.length - 1];
      
      if (highestAvg.average !== lowestAvg.average) {
        const avgDifference = ((highestAvg.average - lowestAvg.average) / lowestAvg.average) * 100;
        crossInsights.push(
          `📊 "<span class="text-green-600 font-semibold">${highestAvg.label}</span>" has <span class="text-green-600 font-semibold">${avgDifference.toFixed(1)}% higher</span> average value than "<span class="text-red-600 font-semibold">${lowestAvg.label}</span>"`
        );
      }
      
      // Compare data point counts
      const sortedByCount = [...csvAnalytics].sort((a, b) => b.count - a.count);
      const mostData = sortedByCount[0];
      const leastData = sortedByCount[sortedByCount.length - 1];
      
      if (mostData.count !== leastData.count) {
        const countDifference = ((mostData.count - leastData.count) / leastData.count) * 100;
        crossInsights.push(
          `📈 "<span class="text-green-600 font-semibold">${mostData.label}</span>" has <span class="text-green-600 font-semibold">${countDifference.toFixed(1)}% more</span> data points than "<span class="text-red-600 font-semibold">${leastData.label}</span>"`
        );
      }
    }
    
    return crossInsights;
  };

  const crossDatasetInsights = generateCrossDatasetInsights();

  const StatCard: React.FC<{ data: AnalyticsData; icon: React.ReactNode; subtitle?: string }> = ({ 
    data, 
    icon, 
    subtitle 
  }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <div className="flex items-center gap-2">
          {data.color && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
          )}
          <h4 className="font-medium text-gray-900 text-sm">{data.label}</h4>
        </div>
      </div>
      {subtitle && <p className="text-xs text-gray-500 mb-2">{subtitle}</p>}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Total:</span>
          <span className="font-semibold text-sm">{formatCurrency(data.total, datasets.find(d => d.label === data.label)?.unit || 'SAR')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Average:</span>
          <span className="font-semibold text-sm">{formatCurrency(data.average, datasets.find(d => d.label === data.label)?.unit || 'SAR')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Data Points:</span>
          <span className="font-semibold text-sm">{data.count}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* CSV Level Analytics */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Complete Dataset Analytics</h3>
          <span className="text-sm text-gray-500">(All uploaded data)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {csvAnalytics.map((data, index) => (
            <StatCard
              key={index}
              data={data}
              icon={<Calculator className="h-4 w-4 text-blue-600" />}
              subtitle="Complete dataset"
            />
          ))}
        </div>
      </div>

      {/* Date Range Level Analytics */}
      {dateRange.startDate && dateRange.endDate && (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Date Range Analytics</h3>
            <span className="text-sm text-gray-500">
              ({new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dateRangeAnalytics.map((data, index) => (
              <StatCard
                key={index}
                data={data}
                icon={<Calendar className="h-4 w-4 text-green-600" />}
                subtitle="Filtered date range"
              />
            ))}
          </div>
        </div>
      )}

      {/* Color Period Analytics */}
      {colorPeriods.length > 0 && colorPeriodAnalytics.some(periods => periods.length > 0) && (
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Color Period Analytics</h3>
            <span className="text-sm text-gray-500">({colorPeriods.length} periods defined)</span>
          </div>
          <div className="space-y-4">
            {colorPeriodAnalytics.map((periods, datasetIndex) => (
              periods.length > 0 && (
                <div key={datasetIndex}>
                  <h4 className="font-medium text-gray-800 mb-2">{datasets[datasetIndex].label}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {periods.map((data, periodIndex) => (
                      <StatCard
                        key={periodIndex}
                        data={data}
                        icon={<Palette className="h-4 w-4 text-purple-600" />}
                        subtitle="Custom period"
                      />
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Insights Section */}
      {insights.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
          </div>
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-1 h-1 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: insight }}></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Dataset Comparison */}
      {datasets.length >= 2 && (
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Dataset Comparison</h3>
            <span className="text-sm text-gray-500">({datasets.length} datasets)</span>
          </div>
          
          {/* Side-by-side comparison cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {csvAnalytics.slice(0, 2).map((data, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-indigo-200">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: data.color }}
                  />
                  <h4 className="font-semibold text-gray-900">{data.label}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold">{formatCurrency(data.total, datasets.find(d => d.label === data.label)?.unit || 'SAR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average:</span>
                    <span className="font-semibold">{formatCurrency(data.average, datasets.find(d => d.label === data.label)?.unit || 'SAR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data Points:</span>
                    <span className="font-semibold">{data.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Comparison metrics */}
          {csvAnalytics.length >= 2 && (
            <div className="bg-white p-4 rounded-lg border border-indigo-200">
              <h4 className="font-medium text-gray-900 mb-3">Head-to-Head Comparison</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">Total Difference</div>
                  <div className="font-semibold text-lg">
                    {formatCurrency(Math.abs(csvAnalytics[0].total - csvAnalytics[1].total), datasets[0]?.unit || 'SAR')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(((Math.abs(csvAnalytics[0].total - csvAnalytics[1].total)) / Math.min(csvAnalytics[0].total, csvAnalytics[1].total)) * 100).toFixed(1)}% difference
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">Average Difference</div>
                  <div className="font-semibold text-lg">
                    {formatCurrency(Math.abs(csvAnalytics[0].average - csvAnalytics[1].average), datasets[0]?.unit || 'SAR')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(((Math.abs(csvAnalytics[0].average - csvAnalytics[1].average)) / Math.min(csvAnalytics[0].average, csvAnalytics[1].average)) * 100).toFixed(1)}% difference
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">Data Points Difference</div>
                  <div className="font-semibold text-lg">
                    {Math.abs(csvAnalytics[0].count - csvAnalytics[1].count)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(((Math.abs(csvAnalytics[0].count - csvAnalytics[1].count)) / Math.min(csvAnalytics[0].count, csvAnalytics[1].count)) * 100).toFixed(1)}% difference
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Cross-dataset insights */}
          {crossDatasetInsights.length > 0 && (
            <div className="mt-4 bg-white p-3 rounded-lg border border-indigo-200">
              <h5 className="font-medium text-gray-900 mb-2">Dataset Insights</h5>
              <div className="space-y-1">
                {crossDatasetInsights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: insight }}></p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparison Summary */}
      {dateRange.startDate && dateRange.endDate && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Comparison Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Dataset</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Complete Total</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Complete Avg</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Range Total</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Range Avg</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {csvAnalytics.map((csvData, index) => {
                  const rangeData = dateRangeAnalytics[index];
                  const percentageOfTotal = rangeData ? (rangeData.total / csvData.total) * 100 : 0;
                  
                  return (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: csvData.color }}
                          />
                          {csvData.label}
                        </div>
                      </td>
                      <td className="text-right py-2 px-3 font-mono">
                        {formatCurrency(csvData.total, datasets.find(d => d.label === csvData.label)?.unit || 'SAR')}
                      </td>
                      <td className="text-right py-2 px-3 font-mono">
                        {formatCurrency(csvData.average, datasets.find(d => d.label === csvData.label)?.unit || 'SAR')}
                      </td>
                      <td className="text-right py-2 px-3 font-mono">
                        {rangeData ? formatCurrency(rangeData.total, datasets.find(d => d.label === csvData.label)?.unit || 'SAR') : '-'}
                      </td>
                      <td className="text-right py-2 px-3 font-mono">
                        {rangeData ? formatCurrency(rangeData.average, datasets.find(d => d.label === csvData.label)?.unit || 'SAR') : '-'}
                      </td>
                      <td className="text-right py-2 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          percentageOfTotal > 50 
                            ? 'bg-green-100 text-green-800' 
                            : percentageOfTotal > 25 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {percentageOfTotal.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};