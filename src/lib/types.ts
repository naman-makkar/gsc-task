// Metric types
export type MetricType = 'clicks' | 'impressions' | 'ctr' | 'position';

export interface Metric {
  id: string;
  type: MetricType;
  name: string;
  description: string;
  icon?: string;
}

// Time range types
export type TimeRangeType = 'last7days' | 'last28days' | 'last3months' | 'custom';

export interface TimeRange {
  type: TimeRangeType;
  name: string;
  startDate: Date;
  endDate: Date;
  isCustom: boolean;
}

// Report configuration
export interface ReportConfig {
  selectedMetrics: Metric[];
  timeRange: TimeRange;
  siteUrl: string | null;
}

// Draggable item type for dnd-kit
export interface DraggableItem {
  id: string;
  type: 'metric';
  data: Metric;
} 