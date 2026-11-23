import React from 'react';
import { BaseChart } from './base-chart';

interface TrainingLoadChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export function TrainingLoadChart({ data }: TrainingLoadChartProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-4">Training Load (Last 30 Days)</h3>
      <BaseChart 
        data={data}
        dataKey="value"
        color="#166534" // Forest green
      />
    </div>
  );
}