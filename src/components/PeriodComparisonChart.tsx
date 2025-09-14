import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatCurrency } from '../utils/currencyController';
import { formatDateLabel, aggregateData } from '../utils/dataAggregator';
import { groupDataByColor } from '../utils/periodColorUtils';
import { Dataset, DataPoint, TimeView, ColorPeriod } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PeriodComparisonChartProps {
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

export const PeriodComparisonChart: React.FC<PeriodComparisonChartProps> = ({ 
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
          <div className="text-sm">Upload CSV files and set alignment dates to see period comparison</div>
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
  
  // Get the maximum day offset across all datasets to determine chart range
  const maxDayOffset = Math.max(
    ...alignedDatasets.map(dataset => 
      dataset.alignedData?.length > 0 
        ? Math.max(...dataset.alignedData.map(point => point.dayOffset))
        : 0
    )
  );

  // Create labels for the chart (Day 0, Day 1, etc.)
  const labels = Array.from({ length: maxDayOffset + 1 }, (_, i) => {
    if (timeView === 'daily') {
      return `Day ${i}`;
    } else if (timeView === 'weekly') {
      return `Week ${i}`;
    } else {
      return `Month ${i}`;
    }
  });

  // Create chart data
  const chartData = {
    labels,
    datasets: alignedDatasets
      .filter(dataset => dataset.alignedData && dataset.alignedData.length > 0)
      .map(dataset => ({
        label: dataset.label,
        data: labels.map((_, dayIndex) => {
          const point = dataset.alignedData?.find(p => p.dayOffset === dayIndex);
          return point ? point.value : null;
        }),
        borderColor: dataset.color,
        backgroundColor: dataset.color + '20',
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
        fill: false,
      })),
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          font: {
            size: 14,
          },
        },
      },
      title: {
        display: true,
        text: `Period Comparison - Aligned Timeline (${timeView.charAt(0).toUpperCase() + timeView.slice(1)} View)`,
        font: {
          size: 18,
          weight: 'bold',
        },
        padding: 20,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            const datasetLabel = context.dataset.label || '';
            const dataset = alignedDatasets.find(d => d.label === datasetLabel);
            const unit = dataset?.unit || 'SAR';
            
            if (value === null) return `${context.dataset.label}: N/A`;
            
            // Get the original date for this point
            const dayOffset = context.dataIndex;
            const alignedPoint = dataset?.alignedData?.find(p => p.dayOffset === dayOffset);
            
            let dateInfo = '';
            if (alignedPoint) {
              if (timeView === 'daily') {
                dateInfo = ` (${new Date(alignedPoint.originalDate).toLocaleDateString()})`;
              } else {
                dateInfo = ` (${formatDateLabel(alignedPoint.originalDate, timeView)})`;
              }
            }
            
            return `${context.dataset.label}: ${formatCurrency(value, unit)}${dateInfo}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: timeView === 'daily' 
            ? 'Days from Alignment Date' 
            : timeView === 'weekly'
            ? 'Weeks from Alignment Date'
            : 'Months from Alignment Date',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        ticks: {
          maxTicksLimit: 15,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Value',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        ticks: {
          callback: function(value) {
            // Use the first dataset's unit for the y-axis
            const firstDataset = alignedDatasets.find(d => d.alignedData && d.alignedData.length > 0);
            return formatCurrency(value as number, firstDataset?.unit || 'SAR');
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {/* Chart Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <span className="text-sm font-medium text-blue-900">Period Comparison Chart</span>
        </div>
        <div className="text-sm text-blue-800 space-y-1">
          <div>All datasets are aligned to their respective starting dates for direct comparison ({timeView} view)</div>
          <div className="flex flex-wrap gap-4 mt-2">
            {alignedDatasets.map((dataset, index) => {
              const alignmentDate = alignmentDates[index];
              if (!alignmentDate || !dataset.alignedData || dataset.alignedData.length === 0) return null;
              
              return (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: dataset.color }}
                  />
                  <span className="text-xs">
                    {dataset.label}: starts {new Date(alignmentDate).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="h-96">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};