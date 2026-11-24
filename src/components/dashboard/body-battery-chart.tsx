import { BaseChart } from "./base-chart";
import type { WellnessPoint } from "../../domain/wellness-metrics";

export function BodyBatteryChart({ data }: { data: WellnessPoint[] }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-medium">Body Battery (Last 30 Days)</h3>
      <BaseChart data={data} color="#f97316" type="area" />
    </div>
  );
}
