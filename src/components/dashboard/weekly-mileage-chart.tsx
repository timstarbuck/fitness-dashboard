import React from 'react';
import { BaseChart } from './base-chart';
import type { DistanceUnit } from '../../domain/types';

interface WeeklyMileageChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  unit?: DistanceUnit; // miles by default; meters for rowing
}

export function WeeklyMileageChart({ data, unit = "miles" }: WeeklyMileageChartProps) {
  const meters = unit === "meters";
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-4">{meters ? "Weekly Distance (m)" : "Weekly Mileage (mi)"}</h3>
      <BaseChart 
        data={data}
        dataKey="value"
        color="#166534" // Forest green
        type="bar"
        xAxisLabel="Week"
        yAxisLabel={meters ? "Distance (m)" : "Mileage (mi)"}
      />
    </div>
  );
}