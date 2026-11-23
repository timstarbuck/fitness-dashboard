import { BaseChart } from "./base-chart";
import type { WellnessPoint } from "../../domain/wellness-metrics";

export function SleepScoreChart({ data }: { data: WellnessPoint[] }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-medium">Sleep Score (Last 30 Days)</h3>
      <BaseChart data={data} color="#14532d" type="line" />
    </div>
  );
}
