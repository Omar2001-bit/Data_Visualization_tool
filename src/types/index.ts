export interface DataPoint {
  date: string;
  value: number;
  average?: number;
  count?: number;
}

export interface Dataset {
  label: string;
  data: DataPoint[];
  color: string;
  metricName: string;
  unit?: string;
}

export type TimeView = 'daily' | 'weekly' | 'monthly';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ColorPeriod {
  id: string;
  startDate: string;
  endDate: string;
  color: string;
  label: string;
}

export interface GraphGroup {
  id: string;
  name: string;
  datasetIndices: number[];
}
