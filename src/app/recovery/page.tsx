import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { BodyBatteryChart } from "../../components/dashboard/body-battery-chart";
import { HrvTrendChart } from "../../components/dashboard/hrv-trend-chart";
import { KpiCard } from "../../components/dashboard/kpi-card";
import { SleepScoreChart } from "../../components/dashboard/sleep-score-chart";
import { StressChart } from "../../components/dashboard/stress-chart";
import { bodyBatterySeries, hrvSeries, sleepScoreSeries, stressSeries } from "../../domain/wellness-metrics";
import { computeSleepScore } from "../../domain/sleep-score";
import { addDays, calendarDateKey } from "../../lib/dates";
import { formatDuration } from "../../lib/formatting";
import { wellnessRepository } from "../../repositories/wellness-repository";

const TREND_DAYS = 30;

export const metadata: Metadata = {
  title: "Recovery",
  description: "Sleep score, HRV, stress, and body battery trends for recovery tracking.",
};

export default function RecoveryPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Recovery</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Loading recovery…</p>}>
        <RecoveryContent />
      </Suspense>
    </div>
  );
}

async function RecoveryContent() {
  // Opt into request-time rendering so `new Date()` below is not baked in at prerender.
  await connection();

  const now = new Date();
  // Inclusive trailing window for the trend charts.
  const sinceKey = calendarDateKey(addDays(now, -(TREND_DAYS - 1)));
  const untilKey = calendarDateKey(now);

  const [sleepRows, hrvRows, summaryRows, latestSleep, latestHrv, latestSummary] = await Promise.all([
    wellnessRepository.findSleepSince(sinceKey, untilKey),
    wellnessRepository.findHrvSince(sinceKey, untilKey),
    wellnessRepository.findDailySummarySince(sinceKey, untilKey),
    wellnessRepository.findLatestSleep(),
    wellnessRepository.findLatestHrv(),
    wellnessRepository.findLatestDailySummary(),
  ]);

  // KPI cards use the most recent measured values.
  const sleepScore = latestSleep ? computeSleepScore(latestSleep) : null;

  const hrvValue = latestHrv ? (latestHrv.lastNightAvg ?? latestHrv.weeklyAvg) : null;
  // balancedLow is the ms reference (Garmin's balanced-zone lower bound); markerValue is a normalized chart position.
  const hrvBaseline = latestHrv?.baselineBalancedLow ?? null;
  const hrvDelta = hrvValue != null && hrvBaseline != null && hrvBaseline > 0 ? Math.round((hrvValue / hrvBaseline - 1) * 100) : null;

  const restingHr = latestSummary?.restingHeartRate ?? null;

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Sleep Score"
          value={sleepScore ?? "—"}
          unit={sleepScore != null ? "/100" : undefined}
          hint={latestSleep?.sleepTimeSeconds != null ? `${formatDuration(latestSleep.sleepTimeSeconds)}${latestSleep.sleepScoreFeedback ? ` · ${latestSleep.sleepScoreFeedback}` : ""}` : undefined}
        />
        <KpiCard
          title="HRV"
          value={hrvValue != null ? Math.round(hrvValue) : "—"}
          unit={hrvValue != null ? "ms" : undefined}
          hint={hrvDelta != null ? `${hrvDelta >= 0 ? "+" : ""}${hrvDelta}% vs baseline` : "last night"}
        />
        <KpiCard title="Resting HR" value={restingHr ?? "—"} unit={restingHr != null ? "bpm" : undefined} hint="most recent day" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SleepScoreChart data={sleepScoreSeries(sleepRows, TREND_DAYS, now)} />
        <HrvTrendChart data={hrvSeries(hrvRows, TREND_DAYS, now)} />
        <BodyBatteryChart data={bodyBatterySeries(summaryRows, TREND_DAYS, now)} />
        <StressChart data={stressSeries(summaryRows, TREND_DAYS, now)} />
      </div>
    </>
  );
}
