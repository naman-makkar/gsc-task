'use client';

import React, { useState } from 'react';
import { 
  DndContext, 
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useReportBuilder } from '@/context/ReportBuilderContext';

import { MetricSelector } from './MetricSelector';
import { SelectedMetricsPanel } from './SelectedMetricsPanel';
import { TimeRangeSelector } from './TimeRangeSelector';

interface ReportBuilderProps {
  siteUrl: string | null;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({ siteUrl }) => {
  const { 
    selectedMetrics, 
    addMetric, 
    availableMetrics,
    reorderSelectedMetrics,
    getReportConfig
  } = useReportBuilder();
  
  const [, _setActiveId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configure the sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 10 pixels before activating
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      // Press delay of 250ms, with tolerance of 5px of movement
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // When drag starts
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    _setActiveId(active.id as string);
  };

  // When dragging over a droppable area
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    // If dropping a metric into the selected metrics panel
    if (
      active.id !== over?.id &&
      over?.id === 'selected-metrics-droppable'
    ) {
      // Find the metric being dragged
      const metric = availableMetrics.find(m => m.id === active.id);
      if (metric) {
        addMetric(metric);
      }
    }
  };

  // When drag ends
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    _setActiveId(null);

    // If dropping to reorder within the selected metrics
    if (
      active.id !== over?.id &&
      over &&
      selectedMetrics.some(m => m.id === active.id) &&
      selectedMetrics.some(m => m.id === over.id)
    ) {
      // Find the positions within the array
      const oldIndex = selectedMetrics.findIndex(m => m.id === active.id);
      const newIndex = selectedMetrics.findIndex(m => m.id === over.id);
      
      // Reorder the metrics
      reorderSelectedMetrics(oldIndex, newIndex);
    }
  };

  const handleGenerateReport = async () => {
    setIsSubmitting(true);
    try {
      const config = getReportConfig();
      
      // Validate that we have sufficient selections
      if (config.selectedMetrics.length === 0) {
        alert('Please select at least one metric');
        setIsSubmitting(false);
        return;
      }
      
      if (!config.siteUrl) {
        alert('No site URL selected');
        setIsSubmitting(false);
        return;
      }
      
      console.log('Generating report with config:', config);
      
      // Format the data for the API request
      const requestData = {
        siteUrl: config.siteUrl,
        metrics: config.selectedMetrics.map(m => m.type),
        timeRange: {
          startDate: config.timeRange.startDate.toISOString().split('T')[0],
          endDate: config.timeRange.endDate.toISOString().split('T')[0]
        },
        dimensions: ['query']
      };
      
      // Call the API endpoint
      const response = await fetch('/api/gsc/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }
      
      const reportData: Record<string, unknown> = await response.json();
      
      // Save report data to localStorage for the results page to use
      localStorage.setItem('lastReportData', JSON.stringify(reportData));
      
      // Generate a unique report ID based on timestamp
      const reportId = Date.now().toString();
      
      // Also save the report to Supabase for future reference
      await saveReportToSupabase(reportData, reportId);
      
      // Redirect to the results page
      window.location.href = `/dashboard/report-results?reportId=${reportId}`;
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to save the report to Supabase
  const saveReportToSupabase = async (reportData: Record<string, unknown>, reportId: string) => {
    try {
      const saveResponse = await fetch('/api/reports/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportData,
          reportId
        }),
      });
      
      if (!saveResponse.ok) {
        console.error('Failed to save report to Supabase');
      } else {
        console.log('Report saved to Supabase successfully');
      }
    } catch (error) {
      console.error('Error saving report to Supabase:', error);
      // Don't throw error here, as we don't want to block the report generation flow
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-200">Build Your GSC Report</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Drag and drop metrics, select a time range, and generate your custom report.
            {siteUrl && (
              <span className="block mt-1 text-sm">
                Site: <span className="font-medium text-gray-800 dark:text-gray-300">{siteUrl}</span>
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <MetricSelector />
          <SelectedMetricsPanel />
        </div>

        <div className="mb-8">
          <TimeRangeSelector />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleGenerateReport}
            disabled={isSubmitting || selectedMetrics.length === 0}
            className={`
              px-6 py-3 rounded-lg text-white font-medium transition-colors
              ${isSubmitting || selectedMetrics.length === 0
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {isSubmitting ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
    </DndContext>
  );
}; 