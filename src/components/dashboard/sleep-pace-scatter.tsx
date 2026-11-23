"use client";

import { useMemo } from "react";
import type { TopLevelFormatterParams } from "echarts/types/dist/shared";
import type { CorrelationPoint } from "../../domain/wellness-metrics";
import { AXIS_LABEL_COLOR, EChartsChart, SPLIT_LINE_COLOR, type EChartsOption } from "./echarts-chart";

/** Scatter of derived sleep score (x) vs run pace in min/mi (y), one point per run. */
export function SleepPaceScatter({ points }: { points: CorrelationPoint[] }) {
  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: "item",
        formatter: (params: TopLevelFormatterParams) => {
          const p = Array.isArray(params) ? params[0] : params;
          const d = p.data as { value?: [number, number]; date?: string; name?: string } | undefined;
          if (!d?.value) return "";
          const label = [d.name, d.date].filter(Boolean).join(" · ");
          return `${label}<br/>Sleep score: ${d.value[0]}<br/>Pace: ${d.value[1]} min/mi`;
        },
      },
      grid: { left: 56, right: 24, top: 24, bottom: 40 },
      xAxis: { type: "value", name: "Sleep Score", min: 0, max: 100, axisLabel: { color: AXIS_LABEL_COLOR }, splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } } },
      yAxis: { type: "value", name: "Pace (min/mi)", axisLabel: { color: AXIS_LABEL_COLOR }, splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } } },
      series: [
        {
          type: "scatter",
          symbolSize: 9,
          itemStyle: { color: "#166534", opacity: 0.7 },
          data: points.map((p) => ({ value: [p.x, p.y], date: p.date, name: p.name })),
        },
      ],
    }),
    [points],
  );

  return <EChartsChart option={option} />;
}
