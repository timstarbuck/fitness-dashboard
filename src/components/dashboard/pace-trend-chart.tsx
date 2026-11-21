import React from 'react';
import { BaseChart } from './base-chart';

interface PaceTrendChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export function PaceTrendChart({ data }: PaceTrendChartProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-4">Average Pace Trend (min/km)</h3>
      <BaseChart 
        data={data}
        dataKey="value"
        color="#F97316" // Orange
      />
    </div>
  );
}