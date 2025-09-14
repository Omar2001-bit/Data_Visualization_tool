import { DataPoint, TimeView } from '../types';

export interface AggregatedDataPoint extends DataPoint {
  average?: number;
  count?: number;
}

export const aggregateData = (data: DataPoint[], timeView: TimeView): AggregatedDataPoint[] => {
  if (timeView === 'daily') {
    return data; // No aggregation needed for daily view
  }
  
  const aggregated = new Map<string, { total: number; count: number }>();
  
  data.forEach(point => {
    const date = new Date(point.date);
    let key: string;
    
    if (timeView === 'weekly') {
      // Get the Monday of the week
      const monday = new Date(date);
      monday.setDate(date.getDate() - date.getDay() + 1);
      key = monday.toISOString().split('T')[0];
    } else { // monthly
      // Get the first day of the month
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    }
    
    const existing = aggregated.get(key) || { total: 0, count: 0 };
    aggregated.set(key, {
      total: existing.total + point.value,
      count: existing.count + 1
    });
  });
  
  // Convert back to DataPoint array and sort
  return Array.from(aggregated.entries())
    .map(([date, { total, count }]) => ({ 
      date, 
      value: total, 
      average: total / count,
      count 
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const formatDateLabel = (dateString: string, timeView: TimeView): string => {
  const date = new Date(dateString);
  
  switch (timeView) {
    case 'daily':
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    case 'weekly':
      const endOfWeek = new Date(date);
      endOfWeek.setDate(date.getDate() + 6);
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'monthly':
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
    default:
      return dateString;
  }
};