"use client";

import { useMemo } from "react";
import type { TopLevelFormatterParams } from "echarts/types/dist/shared";
import type { CorrelationPoint } from "../../domain/wellness-metrics";
import { AXIS_LABEL_COLOR, EChartsChart, SPLIT_LINE_COLOR, type EChartsOption } from "./echarts-chart";

/** Scatter of average daily stress (x) vs body battery (y), one point per day. */
export function StressBatteryScatter({ points }: { points: CorrelationPoint[] }) {
  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: "item",
        formatter: (params: TopLevelFormatterParams) => {
          const p = Array.isArray(params) ? params[0] : params;
          const d = p.data as { value?: [number, number]; date?: string } | undefined;
          if (!d?.value) return "";
          return `${d.date ?? ""}<br/>Stress: ${d.value[0]}<br/>Body battery: ${d.value[1]}`;
        },
      },
      grid: { left: 56, right: 24, top: 24, bottom: 40 },
      xAxis: { type: "value", name: "Avg Stress", min: 0, max: 100, axisLabel: { color: AXIS_LABEL_COLOR }, splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } } },
      yAxis: { type: "value", name: "Body Battery", min: 0, max: 100, axisLabel: { color: AXIS_LABEL_COLOR }, splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } } },
      series: [
        {
          type: "scatter",
          symbolSize: 9,
          itemStyle: { color: "#f97316", opacity: 0.7 },
          data: points.map((p) => ({ value: [p.x, p.y], date: p.date })),
        },
      ],
    }),
    [points],
  );

  return <EChartsChart option={option} />;
}
