import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  hint?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function KpiCard({ title, value, unit, icon, hint, trend }: KpiCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-1">
        <h2 className={`text-2xl font-bold ${value === "—" ? "text-muted-foreground" : ""}`}>{value}</h2>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {trend && (
        <p className={`text-xs mt-1 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {trend.isPositive ? '+' : ''}{trend.value}% {trend.isPositive ? 'vs last month' : 'vs last month'}
        </p>
      )}
    </div>
  );
}
