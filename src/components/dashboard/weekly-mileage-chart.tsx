import React from 'react';
import { BaseChart } from './base-chart';

interface WeeklyMileageChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export function WeeklyMileageChart({ data }: WeeklyMileageChartProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-4">Weekly Mileage (mi)</h3>
      <BaseChart 
        data={data}
        dataKey="value"
        color="#166534" // Forest green
        type="bar"
      />
    </div>
  );
}