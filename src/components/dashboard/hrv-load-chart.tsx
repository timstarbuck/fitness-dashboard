"use client";

import { useMemo } from "react";
import type { HrvLoadPoint } from "../../domain/wellness-metrics";
import { AXIS_LABEL_COLOR, EChartsChart, SPLIT_LINE_COLOR, type EChartsOption } from "./echarts-chart";

/** Dual-axis overlay: daily training load (miles, left) vs HRV (ms, right), with the HRV baseline as a dashed reference. */
export function HrvLoadChart({ points, baseline }: { points: HrvLoadPoint[]; baseline: number | null }) {
  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: "axis" },
      legend: { data: ["Training Load (mi)", "HRV (ms)"], textStyle: { color: AXIS_LABEL_COLOR } },
      grid: { left: 48, right: 56, top: 32, bottom: 28 },
      xAxis: { type: "category", boundaryGap: false, data: points.map((p) => p.name), axisLabel: { color: AXIS_LABEL_COLOR } },
      yAxis: [
        { type: "value", name: "mi", axisLabel: { color: AXIS_LABEL_COLOR }, splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } } },
        { type: "value", name: "ms", axisLabel: { color: AXIS_LABEL_COLOR }, splitLine: { show: false } },
      ],
      series: [
        { name: "Training Load (mi)", type: "line", data: points.map((p) => p.load), smooth: true, symbol: "none", itemStyle: { color: "#f97316" } },
        { name: "HRV (ms)", type: "line", yAxisIndex: 1, data: points.map((p) => p.hrv), smooth: true, connectNulls: true, itemStyle: { color: "#166534" } },
        ...(baseline != null
          ? [{ name: "HRV Baseline", type: "line" as const, yAxisIndex: 1, data: points.map(() => baseline), symbol: "none", lineStyle: { type: "dashed" as const }, itemStyle: { color: "#44403c" } }]
          : []),
      ],
    }),
    [points, baseline],
  );

  return <EChartsChart option={option} />;
}
