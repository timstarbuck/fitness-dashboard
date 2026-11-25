import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { HrvLoadChart } from "../../components/dashboard/hrv-load-chart";
import { HeartbeatsPerMileChart } from "../../components/dashboard/heartbeats-per-mile-chart";
import { SleepPaceScatter } from "../../components/dashboard/sleep-pace-scatter";
import { StressBatteryScatter } from "../../components/dashboard/stress-battery-scatter";
import { heartbeatsPerMile, hrvVsTrainingLoad, sleepVsPace, stressVsBodyBattery } from "../../domain/wellness-metrics";
import { addDays, calendarDateKey } from "../../lib/dates";
import { activityRepository } from "../../repositories/activity-repository";
import { wellnessRepository } from "../../repositories/wellness-repository";

// Scatter plots pair rows across tables, so they use a wider window for more points.
const SCATTER_DAYS = 90;

export const metadata: Metadata = {
  title: "Analytics",
  description: "Correlations between sleep, stress, heart rate, and training load.",
};

export default function AnalyticsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Loading analytics…</p>}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}

async function AnalyticsContent() {
  // Opt into request-time rendering so `new Date()` below is not baked in at prerender.
  await connection();

  const now = new Date();
  const untilKey = calendarDateKey(now);
  const sinceScatterKey = calendarDateKey(addDays(now, -(SCATTER_DAYS - 1)));
  const sinceTrendKey = calendarDateKey(addDays(now, -29));

  const [sleepRows, hrvRows, summaryRows, activities] = await Promise.all([
    wellnessRepository.findSleepSince(sinceScatterKey, untilKey),
    wellnessRepository.findHrvSince(sinceTrendKey, untilKey),
    wellnessRepository.findDailySummarySince(sinceScatterKey, untilKey),
    activityRepository.findSince(addDays(now, -(SCATTER_DAYS - 1)), now),
  ]);

  const sleepPace = sleepVsPace(sleepRows, activities);
  const { points: hrvLoadPoints, baseline } = hrvVsTrainingLoad(hrvRows, activities, 30, now);
  const heartbeats = heartbeatsPerMile(activities, SCATTER_DAYS, now);
  const stressBattery = stressVsBodyBattery(summaryRows);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-medium">HRV vs Training Load</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Daily training load (miles) against HRV, with the current HRV baseline as a dashed reference.
        </p>
        <HrvLoadChart points={hrvLoadPoints} baseline={baseline} />
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-medium">Heartbeats per Mile</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Heartbeats per mile (avg heart rate × duration ÷ distance) for each activity in the last {SCATTER_DAYS} days.
        </p>
        {heartbeats.length > 0 ? (
          <HeartbeatsPerMileChart points={heartbeats} />
        ) : (
          <EmptyChart note={`No activities with heart rate data in the last ${SCATTER_DAYS} days.`} />
        )}
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-medium">Sleep vs Run Pace</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Each point is a run paired with the sleep score from the night before. A downward trend suggests better
          recovery leads to faster pace.
        </p>
        {sleepPace.length > 0 ? (
          <SleepPaceScatter points={sleepPace} />
        ) : (
          <EmptyChart note={`No runs with matching sleep data in the last ${SCATTER_DAYS} days.`} />
        )}
      </section>


      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-medium">Stress vs Body Battery</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Each point is a day. A negative trend suggests higher stress drains body battery.
        </p>
        {stressBattery.length > 0 ? (
          <StressBatteryScatter points={stressBattery} />
        ) : (
          <EmptyChart note={`No days with both stress and body battery in the last ${SCATTER_DAYS} days.`} />
        )}
      </section>
    </div>
  );
}

function EmptyChart({ note }: { note: string }) {
  return (
    <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {note}
    </div>
  );
}
