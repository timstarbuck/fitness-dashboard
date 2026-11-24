import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ActivityHistory } from "../../components/dashboard/activity-history";
import { ActivityTypeFilter, type ActivityTypeOption } from "../../components/dashboard/activity-type-filter";
import { ElevationTrendChart } from "../../components/dashboard/elevation-trend-chart";
import { MonthlyMileageChart } from "../../components/dashboard/monthly-mileage-chart";
import { PaceTrendChart } from "../../components/dashboard/pace-trend-chart";
import { WeeklyMileageChart } from "../../components/dashboard/weekly-mileage-chart";
import { monthlyMileage, trendWindowStart, weeklyElevation, weeklyMileage, weeklyPaceTrend } from "../../domain/activity-metrics";
import { activityTypeLabel, distanceUnitForType, distinctActivityTypes, filterByActivityType } from "../../domain/activity-types";
import { activityRepository } from "../../repositories/activity-repository";

export default function ActivitiesPage({ searchParams }: PageProps<"/activities">) {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Activities</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Loading activities…</p>}>
        <FitnessContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** The `type` search param; null means "all activities". */
function parseType(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v !== "all" ? v : null;
}

async function FitnessContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Opt into request-time rendering so `new Date()` below is not baked in at prerender.
  await connection();

  const sp = await searchParams;
  const type = parseType(sp.type); // null = all activities

  const now = new Date();
  // ~6-month window covers the weekly + monthly charts; history is a separate capped query.
  const [activities, recent] = await Promise.all([
    activityRepository.findSince(trendWindowStart(now), now),
    activityRepository.findRecent(50),
  ]);

  // Dropdown options come from the full dataset so every type stays selectable.
  const options: ActivityTypeOption[] = distinctActivityTypes(activities).map((t) => ({
    value: t,
    label: activityTypeLabel(t),
  }));

  // Charts reflect only the selected type; rowing is shown in meters, others in miles.
  const filtered = filterByActivityType(activities, type);
  const unit = distanceUnitForType(type);

  return (
    <>
      <div className="mb-6">
        <ActivityTypeFilter options={options} />
      </div>
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <WeeklyMileageChart data={weeklyMileage(filtered, unit)} unit={unit} />
        <MonthlyMileageChart data={monthlyMileage(filtered, unit)} unit={unit} />
        <PaceTrendChart data={weeklyPaceTrend(filtered)} />
        <ElevationTrendChart data={weeklyElevation(filtered)} />
      </div>
      <ActivityHistory activities={recent} />
    </>
  );
}
