import React from 'react';
import { BaseChart } from './base-chart';
import type { DistanceUnit } from '../../domain/types';

interface YearlyMileageChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  unit?: DistanceUnit; // miles by default; meters for rowing
}

export function YearlyMileageChart({ data, unit = "miles" }: YearlyMileageChartProps) {
  const meters = unit === "meters";
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-4">{meters ? "Yearly Distance (m)" : "Yearly Mileage (mi)"}</h3>
      <BaseChart 
        data={data}
        dataKey="value"
        color="#166534" // Forest green
        type="line"
        xAxisLabel="Year"
        yAxisLabel={meters ? "Distance (m)" : "Mileage (mi)"}
      />
    </div>
  );
}
