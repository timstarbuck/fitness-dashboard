import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { KpiCard } from "../../components/dashboard/kpi-card";
import { ReadinessIndicator } from "../../components/dashboard/readiness-indicator";
import { TrainingLoadChart } from "../../components/dashboard/training-load-chart";
import { type DateRange, dailyDistanceSeries, rangeStartDate } from "../../domain/activity-metrics";
import { computeReadiness } from "../../domain/readiness";
import { activityRepository } from "../../repositories/activity-repository";
import { wellnessRepository } from "../../repositories/wellness-repository";
import { addDays, calendarDateKey } from "../../lib/dates";
import { formatDuration } from "../../lib/formatting";

const RANGES: Array<{ value: DateRange; label: string }> = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All-time" },
];

function parseRange(value: string | string[] | undefined): DateRange {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "month" || v === "all" ? v : "week";
}

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading dashboard…</p>}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Opt into request-time rendering so `new Date()` below is not baked in at prerender.
  await connection();

  const sp = await searchParams;
  const range = parseRange(sp.range);
  const now = new Date();

  // KPIs follow the selected range; training load uses a fixed trailing 30-day window.
  const since = rangeStartDate(range, now);
  const sinceKey = since ? calendarDateKey(since) : null;
  const untilKey = calendarDateKey(now);

  const [sleepRows, hrvRows, dailySummaryRows, loadActivities, latestSleep, latestHrv] = await Promise.all([
    wellnessRepository.findSleepSince(sinceKey, untilKey),
    wellnessRepository.findHrvSince(sinceKey, untilKey),
    wellnessRepository.findDailySummarySince(sinceKey, untilKey),
    activityRepository.findSince(addDays(now, -30), now),
    wellnessRepository.findLatestSleep(),
    wellnessRepository.findLatestHrv(),
  ]);

  // Sleep: daily average over nights that have a measured duration.
  const sleepValues = sleepRows.map((r) => r.sleepTimeSeconds).filter((x): x is number => x != null);
  const avgSleepSeconds = sleepValues.length ? Math.round(sleepValues.reduce((s, x) => s + x, 0) / sleepValues.length) : null;

  // HRV: average of last-night values.
  const hrvValues = hrvRows.map((r) => r.lastNightAvg).filter((x): x is number => x != null);
  const avgHrv = hrvValues.length ? Math.round(hrvValues.reduce((s, x) => s + x, 0) / hrvValues.length) : null;

  // Steps & body battery: daily averages from the user summary.
  const stepValues = dailySummaryRows.map((r) => r.totalSteps).filter((x): x is number => x != null);
  const avgSteps = stepValues.length ? Math.round(stepValues.reduce((s, x) => s + x, 0) / stepValues.length) : null;

  const batteryValues = dailySummaryRows.map((r) => r.bodyBatteryMostRecentValue).filter((x): x is number => x != null);
  const avgBodyBattery = batteryValues.length ? Math.round(batteryValues.reduce((s, x) => s + x, 0) / batteryValues.length) : null;

  const readiness = computeReadiness(latestHrv, latestSleep);

  return (
    <>
      <nav className="mb-6 flex gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.value}
            href={`/dashboard?range=${r.value}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              r.value === range ? "bg-forest text-white" : "border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </nav>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Steps"
          value={avgSteps != null ? avgSteps.toLocaleString() : "—"}
          hint={stepValues.length > 0 ? `daily avg across ${stepValues.length} day${stepValues.length === 1 ? "" : "s"}` : undefined}
        />
        <KpiCard
          title="Avg Sleep"
          value={avgSleepSeconds ? formatDuration(avgSleepSeconds) : "—"}
          hint={sleepValues.length > 0 ? `across ${sleepValues.length} night${sleepValues.length === 1 ? "" : "s"}` : undefined}
        />
        <KpiCard
          title="Body Battery"
          value={avgBodyBattery ?? "—"}
          unit={avgBodyBattery ? "/100" : undefined}
          hint={batteryValues.length > 0 ? `daily avg across ${batteryValues.length} day${batteryValues.length === 1 ? "" : "s"}` : undefined}
        />
        <KpiCard title="HRV" value={avgHrv ?? "—"} unit={avgHrv ? "ms" : undefined} hint={avgHrv ? "avg last-night HRV" : undefined} />
      </div>

      <div className="mb-8">
        <ReadinessIndicator readiness={readiness} />
      </div>

      <TrainingLoadChart data={dailyDistanceSeries(loadActivities, 30, now)} />
    </>
  );
}
