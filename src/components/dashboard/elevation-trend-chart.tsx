import React from 'react';
import { BaseChart } from './base-chart';

interface ElevationTrendChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export function ElevationTrendChart({ data }: ElevationTrendChartProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-4">Weekly Elevation Gain (m)</h3>
      <BaseChart 
        data={data}
        dataKey="value"
        color="#44403C" // Stone
        type="bar"
      />
    </div>
  );
}
