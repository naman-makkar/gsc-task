'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-date-range';
import { useReportBuilder } from '@/context/ReportBuilderContext';
import { TimeRange, TimeRangeType } from '@/lib/types';

// Helper function to get predefined ranges
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

const getLast28Days = (): TimeRange => {
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

const getLast3Months = (): TimeRange => {
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

export const TimeRangeSelector: React.FC = () => {
  const { timeRange, setTimeRange, setCustomDateRange } = useReportBuilder();
  const [showCalendar, setShowCalendar] = useState(false);

  // Predefined time range options
  const timeRangeOptions: { type: TimeRangeType; name: string; range: TimeRange }[] = [
    { type: 'last7days', name: 'Last 7 Days', range: getLast7Days() },
    { type: 'last28days', name: 'Last 28 Days', range: getLast28Days() },
    { type: 'last3months', name: 'Last 3 Months', range: getLast3Months() },
    { 
      type: 'custom', 
      name: 'Custom Range', 
      range: {
        type: 'custom',
        name: 'Custom Range',
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
        isCustom: true,
      }
    },
  ];

  const handleDateRangeChange = (ranges: any) => {
    const { startDate, endDate } = ranges.selection;
    setCustomDateRange(startDate, endDate);
  };

  const handleSelectTimeRange = (rangeOption: TimeRange) => {
    setTimeRange(rangeOption);
    
    if (rangeOption.type === 'custom') {
      setShowCalendar(true);
    } else {
      setShowCalendar(false);
    }
  };

  const formatDateRange = (timeRange: TimeRange) => {
    const { startDate, endDate } = timeRange;
    if (!timeRange.isCustom) return timeRange.name;
    
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-4">Select Time Range</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Choose a time period for your report data.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {timeRangeOptions.map((option) => (
          <button
            key={option.type}
            className={`px-4 py-2 text-sm rounded-md border transition-colors ${
              timeRange.type === option.type
                ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-slate-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-slate-600'
            }`}
            onClick={() => handleSelectTimeRange(option.range)}
          >
            {option.name}
          </button>
        ))}
      </div>

      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
        Current selection: <span className="font-medium">{formatDateRange(timeRange)}</span>
      </div>

      {showCalendar && (
        <div className="mt-4 border dark:border-gray-600 rounded-md p-2 bg-gray-50 dark:bg-slate-700">
          <DateRange
            ranges={[
              {
                startDate: timeRange.startDate,
                endDate: timeRange.endDate,
                key: 'selection',
              },
            ]}
            onChange={handleDateRangeChange}
            moveRangeOnFirstSelection={false}
            months={1}
            direction="horizontal"
            className="w-full rdrDarkMode"
          />
          <div className="flex justify-end mt-2">
            <button
              className="px-3 py-1 text-xs text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              onClick={() => setShowCalendar(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 