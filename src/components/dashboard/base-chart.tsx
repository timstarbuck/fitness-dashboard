"use client";

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, BarChart, Bar } from 'recharts';

interface ChartProps {
  // `value` may be null (no data that day); line/area connect across gaps.
  data: Array<{ name: string; value: number | null }>;
  dataKey?: string;
  color?: string;
  type?: 'line' | 'area' | 'bar';
}

export function BaseChart({ data, dataKey = "value", color = "#8884d8", type = 'line' }: ChartProps) {
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="name" hide />
      <YAxis hide={true} />
      <Tooltip 
        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
        itemStyle={{ color: color }}
      />
    </>
  );

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data}>
            {common}
            <Bar type="monotone" dataKey={dataKey} stroke={color} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : type === 'area' ? (
          <AreaChart data={data}>
            {common}
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={color + '40'} connectNulls />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            {common}
            <Line type="monotone" dataKey={dataKey} stroke={color} connectNulls />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
