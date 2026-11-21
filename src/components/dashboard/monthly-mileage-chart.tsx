import React from 'react';
import { BaseChart } from './base-chart';

interface MonthlyMileageChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export function MonthlyMileageChart({ data }: MonthlyMileageChartProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-4">Monthly Mileage</h3>
      <BaseChart 
        data={data}
        dataKey="value"
        color="#14532D" // Pine
        type="area"
      />
    </div>
  );
}