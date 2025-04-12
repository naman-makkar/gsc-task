'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Metric, TimeRange, ReportConfig } from '@/lib/types';

// Define available metrics
const AVAILABLE_METRICS: Metric[] = [
  {
    id: 'clicks',
    type: 'clicks',
    name: 'Clicks',
    description: 'Number of clicks received in search results',
    icon: 'MousePointerClickIcon',
  },
  {
    id: 'impressions',
    type: 'impressions',
    name: 'Impressions',
    description: 'Number of times your site appeared in search results',
    icon: 'EyeIcon',
  },
  {
    id: 'ctr',
    type: 'ctr',
    name: 'CTR',
    description: 'Click-through rate (clicks/impressions)',
    icon: 'PercentIcon',
  },
  {
    id: 'position',
    type: 'position',
    name: 'Position',
    description: 'Average position in search results',
    icon: 'ArrowUpDownIcon',
  },
];

// Get last 7 days range
const getLast7Days = (): TimeRange => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  return {
    type: 'last7days',
    name: 'Last 7 Days',
    startDate,
    endDate,
    isCustom: false,
  };
};

// Get last 28 days range
const _getLast28Days = (): TimeRange => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 28);
  
  return {
    type: 'last28days',
    name: 'Last 28 Days',
    startDate,
    endDate,
    isCustom: false,
  };
};

// Get last 3 months range
const _getLast3Months = (): TimeRange => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);
  
  return {
    type: 'last3months',
    name: 'Last 3 Months',
    startDate,
    endDate,
    isCustom: false,
  };
};

interface ReportBuilderContextProps {
  availableMetrics: Metric[];
  selectedMetrics: Metric[];
  timeRange: TimeRange;
  addMetric: (metric: Metric) => void;
  removeMetric: (metricId: string) => void;
  setTimeRange: (range: TimeRange) => void;
  setCustomDateRange: (startDate: Date, endDate: Date) => void;
  resetConfig: () => void;
  getReportConfig: () => ReportConfig;
  isMetricSelected: (metricId: string) => boolean;
  reorderSelectedMetrics: (startIndex: number, endIndex: number) => void;
}

const ReportBuilderContext = createContext<ReportBuilderContextProps | undefined>(undefined);

interface ReportBuilderProviderProps {
  children: ReactNode;
  siteUrl: string | null;
}

export const ReportBuilderProvider: React.FC<ReportBuilderProviderProps> = ({ 
  children,
  siteUrl
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>(getLast7Days());
  
  // Check if a metric is already selected
  const isMetricSelected = (metricId: string): boolean => {
    return selectedMetrics.some(metric => metric.id === metricId);
  };
  
  // Add a metric to selection
  const addMetric = (metric: Metric) => {
    if (!isMetricSelected(metric.id)) {
      setSelectedMetrics(prev => [...prev, metric]);
    }
  };
  
  // Remove a metric from selection
  const removeMetric = (metricId: string) => {
    setSelectedMetrics(prev => prev.filter(metric => metric.id !== metricId));
  };
  
  // Set a predefined time range
  const handleSetTimeRange = (range: TimeRange) => {
    setTimeRange(range);
  };
  
  // Set a custom date range
  const setCustomDateRange = (startDate: Date, endDate: Date) => {
    setTimeRange({
      type: 'custom',
      name: 'Custom Range',
      startDate,
      endDate,
      isCustom: true,
    });
  };
  
  // Reset configuration
  const resetConfig = () => {
    setSelectedMetrics([]);
    setTimeRange(getLast7Days());
  };
  
  // Get the complete report configuration
  const getReportConfig = (): ReportConfig => {
    return {
      selectedMetrics,
      timeRange,
      siteUrl,
    };
  };
  
  // Reorder selected metrics (for drag and drop reordering)
  const reorderSelectedMetrics = (startIndex: number, endIndex: number) => {
    const result = Array.from(selectedMetrics);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setSelectedMetrics(result);
  };
  
  // Load saved configuration from localStorage on component mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('reportConfig');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        
        // Convert string dates back to Date objects
        if (config.timeRange) {
          config.timeRange.startDate = new Date(config.timeRange.startDate);
          config.timeRange.endDate = new Date(config.timeRange.endDate);
          setTimeRange(config.timeRange);
        }
        
        if (config.selectedMetrics) {
          setSelectedMetrics(config.selectedMetrics);
        }
      }
    } catch (error) {
      console.error('Error loading saved configuration:', error);
    }
  }, []);
  
  // Save configuration to localStorage when it changes
  useEffect(() => {
    try {
      const config = {
        selectedMetrics,
        timeRange,
      };
      localStorage.setItem('reportConfig', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  }, [selectedMetrics, timeRange]);
  
  const value = {
    availableMetrics: AVAILABLE_METRICS,
    selectedMetrics,
    timeRange,
    addMetric,
    removeMetric,
    setTimeRange: handleSetTimeRange,
    setCustomDateRange,
    resetConfig,
    getReportConfig,
    isMetricSelected,
    reorderSelectedMetrics,
  };
  
  return (
    <ReportBuilderContext.Provider value={value}>
      {children}
    </ReportBuilderContext.Provider>
  );
};

export const useReportBuilder = (): ReportBuilderContextProps => {
  const context = useContext(ReportBuilderContext);
  if (context === undefined) {
    throw new Error('useReportBuilder must be used within a ReportBuilderProvider');
  }
  return context;
}; 