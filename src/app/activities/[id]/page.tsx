import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { METERS_PER_MILE, activityTypeIcon, formatDuration, paceMinPerMile } from "../../../lib/formatting";
import { formatDisplayDateTime } from "../../../lib/dates";
import { activityRepository } from "../../../repositories/activity-repository";

export default function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading activity…</p>}>
        <ActivityDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ActivityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await activityRepository.findByIdWithSplits(id);
  if (!result) notFound();

  const { activity, splits } = result;

  return (
    <>
      <Link href="/activities" className="text-sm text-muted-foreground hover:text-foreground">
        ← All activities
      </Link>

      <header className="mb-6 mt-4">
        <h1 className="text-3xl font-bold">
          <span aria-hidden>{activityTypeIcon(activity.activityType)}</span> {activity.activityName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {activity.activityType} · {formatDisplayDateTime(activity.startTimeGmt)}
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Distance" value={activity.distance ? `${(activity.distance / METERS_PER_MILE).toFixed(2)} mi` : "—"} />
        <Stat label="Time" value={formatDuration(activity.durationSeconds)} />
        <Stat label="Pace" value={paceMinPerMile(activity.distance, activity.durationSeconds) ?? "—"} />
        <Stat label="Avg HR" value={activity.avgHeartRate ? `${activity.avgHeartRate} bpm` : "—"} />
        <Stat label="Max HR" value={activity.maxHeartRate ? `${activity.maxHeartRate} bpm` : "—"} />
        <Stat label="Calories" value={activity.calories ? `${Math.round(activity.calories)} kcal` : "—"} />
      </div>

      {activity.elevationGain != null || activity.elevationLoss != null ? (
        <div className="mb-8 grid max-w-md grid-cols-2 gap-4">
          <Stat label="Elevation Gain" value={activity.elevationGain != null ? `${Math.round(activity.elevationGain)} m` : "—"} />
          <Stat label="Elevation Loss" value={activity.elevationLoss != null ? `${Math.round(activity.elevationLoss)} m` : "—"} />
        </div>
      ) : null}

      <section className="mb-8 rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium">Splits</h3>
        {splits.length === 0 ? (
          <p className="text-muted-foreground">No splits recorded for this activity.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="p-2 text-left font-medium">#</th>
                  <th className="p-2 text-right font-medium">Distance (mi)</th>
                  <th className="p-2 text-right font-medium">Time</th>
                  <th className="p-2 text-right font-medium">Pace (min/mi)</th>
                </tr>
              </thead>
              <tbody>
                {splits.map((split) => (
                  <tr key={split.id} className="border-b">
                    <td className="p-2">{split.splitNumber}</td>
                    <td className="p-2 text-right">{(split.distance / METERS_PER_MILE).toFixed(2)}</td>
                    <td className="p-2 text-right">{formatDuration(split.durationSeconds)}</td>
                    <td className="p-2 text-right">{paceMinPerMile(split.distance, split.durationSeconds) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <details className="rounded-xl border bg-card p-6 shadow-sm">
        <summary className="cursor-pointer text-lg font-medium">Full Garmin payload</summary>
        {activity.rawPayload ? (
          <pre className="mt-4 max-h-[600px] overflow-auto rounded-lg bg-stone/10 p-4 text-xs leading-relaxed">
            {JSON.stringify(activity.rawPayload, null, 2)}
          </pre>
        ) : (
          <p className="mt-4 text-muted-foreground">No raw payload stored for this activity.</p>
        )}
      </details>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
