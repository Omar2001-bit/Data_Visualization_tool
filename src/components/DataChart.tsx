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
import { formatDateLabel } from '../utils/dataAggregator';
import { formatCurrency } from '../utils/currencyController';
import { groupDataByColor } from '../utils/periodColorUtils';
import { Dataset, TimeView, ColorPeriod, DataPoint } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DataChartProps {
  datasets: Dataset[];
  timeView: TimeView;
  colorPeriods: ColorPeriod[];
}

export const DataChart: React.FC<DataChartProps> = ({ datasets, timeView, colorPeriods }) => {
  // Add comprehensive safety checks
  if (!datasets || !Array.isArray(datasets) || datasets.length === 0 || datasets.every(d => !d || !d.data || !Array.isArray(d.data) || d.data.length === 0)) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No data to display</div>
          <div className="text-sm">Upload CSV files to see your data visualization</div>
        </div>
      </div>
    );
  }

  // Group datasets by metric name for dual-axis logic
  const metricGroups = datasets
    .filter(dataset => dataset && dataset.data && Array.isArray(dataset.data))
    .reduce((groups, dataset) => {
    const metricName = dataset.metricName;
    if (!groups[metricName]) {
      groups[metricName] = [];
    }
    groups[metricName].push(dataset);
    return groups;
  }, {} as Record<string, Dataset[]>);

  const metricNames = Object.keys(metricGroups);
  const hasMultipleMetrics = metricNames.length > 1;
  const primaryMetric = metricNames[0];
  const secondaryMetric = metricNames[1];

  // Get all unique dates from all datasets
  const allDates = Array.from(
    new Set(
      datasets
        .filter(d => d && d.data && Array.isArray(d.data))
        .flatMap(d => d.data.map(point => point && point.date ? point.date : ''))
        .filter(date => date !== '')
    )
  ).sort();

  // Create chart data
  const chartData = {
    labels: allDates.map(date => formatDateLabel(date, timeView)),
    datasets: datasets
      .filter(dataset => dataset && dataset.data && Array.isArray(dataset.data))
      .flatMap((dataset, datasetIndex) => {
      if (colorPeriods.length === 0) {
        // No color periods, use original dataset
        return [{
          label: dataset.label,
          yAxisID: hasMultipleMetrics && dataset.metricName === secondaryMetric ? 'y1' : 'y',
          data: allDates.map(date => {
            const point = dataset.data.find(p => p.date === date);
            return point ? point.value : null;
          }),
          borderColor: dataset.color,
          backgroundColor: dataset.color + '20',
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 6,
          borderWidth: 2,
          fill: false,
        }];
      } else {
        // Group data by color periods
        const colorGroups = groupDataByColor(dataset.data, colorPeriods, dataset.color);
        
        return colorGroups.map((group, groupIndex) => ({
          label: group.label ? `${dataset.label} - ${group.label}` : dataset.label,
          yAxisID: hasMultipleMetrics && dataset.metricName === secondaryMetric ? 'y1' : 'y',
          data: allDates.map(date => {
            const point = group.data.find(p => p.date === date);
            return point ? point.value : null;
          }),
          borderColor: group.color,
          backgroundColor: group.color + '20',
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 6,
          borderWidth: 2,
          fill: false,
        }));
      }
    }),
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
        text: `${hasMultipleMetrics ? 'Multi-Metric' : primaryMetric} Analysis (${timeView.charAt(0).toUpperCase() + timeView.slice(1)} View)`,
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
            const dataset = datasets.find(d => datasetLabel.includes(d.label));
            const unit = dataset?.unit || 'SAR';
            
            if (value === null) return `${context.dataset.label}: N/A`;
            
            // Get the data point to check if it has average info
            const pointIndex = context.dataIndex;
            const date = allDates[pointIndex];
            const chartDataset = datasets.find(d => datasetLabel.includes(d.label));
            const dataPoint = chartDataset?.data.find(p => p.date === date) as DataPoint & { average?: number; count?: number };
            
            let label = `${context.dataset.label}:`;
            
            if (timeView === 'daily') {
              label += ` ${formatCurrency(value, unit)}`;
            } else {
              // For weekly/monthly, show both total and average
              label += ` Total: ${formatCurrency(value, unit)}`;
              if (dataPoint?.average !== undefined) {
                label += `, Avg: ${formatCurrency(dataPoint.average, unit)}`;
              }
              if (dataPoint?.count !== undefined) {
                label += ` (${dataPoint.count} days)`;
              }
            }
            
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        ticks: {
          maxTicksLimit: timeView === 'daily' ? 10 : timeView === 'weekly' ? 8 : 12,
        },
      },
      y: {
        display: true,
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: `${primaryMetric}`,
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        ticks: {
          callback: function(value) {
            const firstDataset = metricGroups[primaryMetric]?.[0];
            return formatCurrency(value as number, firstDataset?.unit || 'SAR');
          },
        },
      },
      ...(hasMultipleMetrics && {
        y1: {
          display: true,
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: `${secondaryMetric}`,
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          ticks: {
            callback: function(value) {
              const firstDataset = metricGroups[secondaryMetric]?.[0];
              return formatCurrency(value as number, firstDataset?.unit || 'SAR');
            },
          },
          grid: {
            drawOnChartArea: false, // Only want the grid lines for one axis to show up
          },
        },
      }),
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {/* Chart Header Info */}
      {hasMultipleMetrics && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">Dual-Axis Chart</span>
          </div>
          <div className="text-sm text-blue-800 space-y-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Left Y-Axis:</span>
                <span className="text-xs">{primaryMetric}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Right Y-Axis:</span>
                <span className="text-xs">{secondaryMetric}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="h-96">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};