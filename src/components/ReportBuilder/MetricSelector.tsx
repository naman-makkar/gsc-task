'use client';

import React from 'react';
import { DraggableMetric } from './DraggableMetric';
import { useReportBuilder } from '@/context/ReportBuilderContext';

export const MetricSelector: React.FC = () => {
  const { availableMetrics, isMetricSelected } = useReportBuilder();

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Metrics</h2>
      <p className="text-sm text-gray-500 mb-4">
        Drag metrics to the selected panel to include them in your report.
      </p>
      
      <div className="space-y-2 mt-4">
        {availableMetrics.map(metric => (
          <DraggableMetric 
            key={metric.id} 
            metric={metric} 
            isSelected={isMetricSelected(metric.id)}
          />
        ))}
      </div>
    </div>
  );
}; 