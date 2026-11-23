import { BaseChart } from "./base-chart";
import type { WellnessPoint } from "../../domain/wellness-metrics";

export function HrvTrendChart({ data }: { data: WellnessPoint[] }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-medium">HRV (Last 30 Days, ms)</h3>
      <BaseChart data={data} color="#166534" type="line" />
    </div>
  );
}
