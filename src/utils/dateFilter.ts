import { DataPoint, DateRange } from '../types';

export const filterDataByDateRange = (data: DataPoint[], dateRange: DateRange): DataPoint[] => {
  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);
  
  return data.filter(point => {
    const pointDate = new Date(point.date);
    return pointDate >= startDate && pointDate <= endDate;
  });
};

export const getDataDateRange = (data: DataPoint[]): DateRange | null => {
  if (data.length === 0) return null;
  
  const dates = data.map(point => new Date(point.date)).sort((a, b) => a.getTime() - b.getTime());
  
  return {
    startDate: dates[0].toISOString().split('T')[0],
    endDate: dates[dates.length - 1].toISOString().split('T')[0]
  };
};

export const getAvailableDateRange = (datasets: DataPoint[][]): DateRange | null => {
  const allData = datasets.flat();
  return getDataDateRange(allData);
};