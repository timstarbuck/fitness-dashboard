"use client";

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, BarChart, Bar, Legend } from 'recharts';

interface ChartProps {
  // `value` may be null (no data that day); line/area connect across gaps.
  data: Array<{ name: string; value: number | null }>;
  dataKey?: string;
  color?: string;
  type?: 'line' | 'area' | 'bar';
  // Optional axis titles + legend. Omit to keep the previous borderless look (axes hidden, no legend).
  xAxisLabel?: string;
  yAxisLabel?: string;
  legendName?: string;
}

export function BaseChart({ data, dataKey = "value", color = "#8884d8", type = 'line', xAxisLabel, yAxisLabel, legendName }: ChartProps) {
  const showX = Boolean(xAxisLabel);
  const showY = Boolean(yAxisLabel);

  // Only reserve extra room when an axis is actually drawn, so charts without
  // labels keep their exact previous layout.
  const margin = showX || showY
    ? { top: 8, right: 16, bottom: showX ? 24 : 0, left: showY ? 8 : 0 }
    : undefined;

  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="name"
        hide={!showX}
        tick={{ fontSize: 12 }}
        label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -18, style: { textAnchor: 'middle' } } : undefined}
      />
      <YAxis
        hide={!showY}
        width={showY ? 56 : undefined}
        tick={{ fontSize: 12 }}
        label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } } : undefined}
      />
      <Tooltip 
        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
        itemStyle={{ color: color }}
      />
      {legendName ? <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" /> : null}
    </>
  );

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={margin}>
            {common}
            <Bar type="monotone" dataKey={dataKey} name={legendName} stroke={color} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : type === 'area' ? (
          <AreaChart data={data} margin={margin}>
            {common}
            <Area type="monotone" dataKey={dataKey} name={legendName} stroke={color} fill={color + '40'} connectNulls />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={margin}>
            {common}
            <Line type="monotone" dataKey={dataKey} name={legendName} stroke={color} connectNulls />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
