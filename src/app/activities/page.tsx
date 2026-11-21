import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ActivityHistory } from "../../components/dashboard/activity-history";
import { ElevationTrendChart } from "../../components/dashboard/elevation-trend-chart";
import { MonthlyMileageChart } from "../../components/dashboard/monthly-mileage-chart";
import { PaceTrendChart } from "../../components/dashboard/pace-trend-chart";
import { WeeklyMileageChart } from "../../components/dashboard/weekly-mileage-chart";
import {
  getActivitiesSince,
  getRecentActivities,
  monthlyMileage,
  trendWindowStart,
  weeklyElevation,
  weeklyMileage,
  weeklyPaceTrend,
} from "../../lib/fitness-data";

export default function ActivitiesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Activities</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Loading activities…</p>}>
        <FitnessContent />
      </Suspense>
    </div>
  );
}

async function FitnessContent() {
  // Opt into request-time rendering so `new Date()` below is not baked in at prerender.
  await connection();

  const now = new Date();
  // ~6-month window covers the weekly + monthly charts; history is a separate capped query.
  const [activities, recent] = await Promise.all([
    getActivitiesSince(trendWindowStart(now), now),
    getRecentActivities(50),
  ]);

  return (
    <>
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <WeeklyMileageChart data={weeklyMileage(activities)} />
        <MonthlyMileageChart data={monthlyMileage(activities)} />
        <PaceTrendChart data={weeklyPaceTrend(activities)} />
        <ElevationTrendChart data={weeklyElevation(activities)} />
      </div>
      <ActivityHistory activities={recent} />
    </>
  );
}
