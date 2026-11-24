import React from 'react';
import { BaseChart } from './base-chart';
import type { DistanceUnit } from '../../domain/types';

interface MonthlyMileageChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  unit?: DistanceUnit; // miles by default; meters for rowing
}

export function MonthlyMileageChart({ data, unit = "miles" }: MonthlyMileageChartProps) {
  const meters = unit === "meters";
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-4">{meters ? "Monthly Distance (m)" : "Monthly Mileage (mi)"}</h3>
      <BaseChart 
        data={data}
        dataKey="value"
        color="#14532D" // Pine
        type="area"
        xAxisLabel="Month"
        yAxisLabel={meters ? "Distance (m)" : "Mileage (mi)"}
      />
    </div>
  );
}