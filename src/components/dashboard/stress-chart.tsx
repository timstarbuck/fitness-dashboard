import { BaseChart } from "./base-chart";
import type { WellnessPoint } from "../../domain/wellness-metrics";

export function StressChart({ data }: { data: WellnessPoint[] }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-medium">Stress (Last 30 Days)</h3>
      <BaseChart data={data} color="#44403c" type="area" />
    </div>
  );
}
