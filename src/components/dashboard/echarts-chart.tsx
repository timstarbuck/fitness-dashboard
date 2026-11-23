"use client";

import { useEffect, useRef } from "react";
// Tree-shaken echarts: only the charts/components we use (keeps the bundle small).
import * as echarts from "echarts/core";
import { LineChart, ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([LineChart, ScatterChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export type EChartsOption = echarts.EChartsCoreOption;

/** Neutral axis colors that read on both light and dark backgrounds. */
export const AXIS_LABEL_COLOR = "#9ca3af";
export const SPLIT_LINE_COLOR = "rgba(107, 114, 128, 0.3)";

interface EChartsChartProps {
  option: EChartsOption;
  height?: number;
}

/** Renders an echarts instance for the given option, resizing with its container. */
export function EChartsChart({ option, height = 320 }: EChartsChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const chart = echarts.init(el);
    chart.setOption(option);

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);

  return <div ref={ref} style={{ height, width: "100%" }} />;
}
