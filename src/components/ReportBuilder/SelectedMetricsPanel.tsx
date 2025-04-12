'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useReportBuilder } from '@/context/ReportBuilderContext';
import { DraggableMetric } from './DraggableMetric';
import { SortableMetric } from './SortableMetric';

export const SelectedMetricsPanel: React.FC = () => {
  const { selectedMetrics, removeMetric } = useReportBuilder();
  const { setNodeRef, isOver } = useDroppable({
    id: 'selected-metrics-droppable',
  });

  const isEmpty = selectedMetrics.length === 0;
  const dropIndicatorClasses = isOver
    ? 'border-blue-300 bg-blue-50'
    : 'border-dashed border-gray-300';

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Metrics</h2>
      <p className="text-sm text-gray-500 mb-4">
        {isEmpty
          ? 'Drag metrics here to include them in your report.'
          : 'Drag to reorder. Click × to remove.'}
      </p>

      <div
        ref={setNodeRef}
        className={`min-h-[200px] rounded-lg border-2 p-4 transition-colors ${dropIndicatorClasses}`}
      >
        {isEmpty ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Drop metrics here</p>
          </div>
        ) : (
          <SortableContext items={selectedMetrics.map(m => m.id)} strategy={verticalListSortingStrategy}>
            {selectedMetrics.map(metric => (
              <SortableMetric
                key={metric.id}
                metric={metric}
                onRemove={() => removeMetric(metric.id)}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}; 