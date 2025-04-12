'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useReportBuilder } from '@/context/ReportBuilderContext';
import { SortableMetric } from './SortableMetric';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, Active } from '@dnd-kit/core';
import { useState } from 'react';

export const SelectedMetricsPanel: React.FC = () => {
  const { selectedMetrics, removeMetric } = useReportBuilder();
  const { setNodeRef, isOver } = useDroppable({
    id: 'selected-metrics-droppable',
  });

  const isEmpty = selectedMetrics.length === 0;
  const dropIndicatorClasses = isOver
    ? 'border-blue-300 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
    : 'border-dashed border-gray-300 dark:border-gray-600';

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-4">Selected Metrics</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
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
            <p className="text-sm text-gray-400 dark:text-gray-500">Drop metrics here</p>
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