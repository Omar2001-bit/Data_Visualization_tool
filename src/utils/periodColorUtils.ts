import { ColorPeriod, DataPoint } from '../types';

export const getPointColor = (dataPoint: DataPoint, colorPeriods: ColorPeriod[], defaultColor: string): string => {
  const pointDate = new Date(dataPoint.date);
  
  // Find the first matching period (periods can overlap, first match wins)
  for (const period of colorPeriods) {
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    
    if (pointDate >= startDate && pointDate <= endDate) {
      return period.color;
    }
  }
  
  return defaultColor;
};

export const getDataPointsWithColors = (data: DataPoint[], colorPeriods: ColorPeriod[], defaultColor: string) => {
  return data.map(point => ({
    ...point,
    color: getPointColor(point, colorPeriods, defaultColor)
  }));
};

export const groupDataByColor = (data: DataPoint[], colorPeriods: ColorPeriod[], defaultColor: string) => {
  const groups = new Map<string, { color: string; data: DataPoint[]; label?: string }>();
  
  // Initialize with default group
  groups.set(defaultColor, { color: defaultColor, data: [] });
  
  // Initialize period groups
  colorPeriods.forEach(period => {
    groups.set(period.color, { color: period.color, data: [], label: period.label });
  });
  
  // Assign data points to groups
  data.forEach(point => {
    const color = getPointColor(point, colorPeriods, defaultColor);
    const group = groups.get(color);
    if (group) {
      group.data.push(point);
    }
  });
  
  // Return only groups that have data
  return Array.from(groups.values()).filter(group => group.data.length > 0);
};