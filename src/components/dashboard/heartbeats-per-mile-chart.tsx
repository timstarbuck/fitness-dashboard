"use client";

import { useMemo } from "react";
import type { HeartbeatPoint } from "../../domain/wellness-metrics";
import { AXIS_LABEL_COLOR, EChartsChart, SPLIT_LINE_COLOR, type EChartsOption } from "./echarts-chart";

/** Line chart of heartbeats per mile, one point per qualifying activity. */
export function HeartbeatsPerMileChart({ points }: { points: HeartbeatPoint[] }) {
  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: "axis" },
      grid: { left: 56, right: 24, top: 24, bottom: 40 },
      xAxis: { type: "category", boundaryGap: false, data: points.map((p) => p.name), axisLabel: { color: AXIS_LABEL_COLOR } },
      yAxis: { type: "value", name: "beats/mi", axisLabel: { color: AXIS_LABEL_COLOR }, splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } } },
      series: [
        { name: "Heartbeats/mi", type: "line", data: points.map((p) => p.value), smooth: true, symbol: "none", itemStyle: { color: "#166534" } },
      ],
    }),
    [points],
  );

  return <EChartsChart option={option} />;
}
