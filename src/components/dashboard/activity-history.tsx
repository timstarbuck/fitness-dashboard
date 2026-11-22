import React from 'react';
import Link from 'next/link';
import { METERS_PER_MILE, activityTypeIcon, formatDuration, paceMinPerMile } from '../../lib/formatting';
import { formatDisplayDate } from '../../lib/dates';
import type { ActivitySummary } from '../../domain/types';

interface ActivityHistoryProps {
  activities: ActivitySummary[];
}

export function ActivityHistory({ activities }: ActivityHistoryProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-medium">Recent Activities</h3>
      {activities.length === 0 ? (
        <p className="text-muted-foreground">No activities yet. Run a sync to pull data from Garmin.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="p-2" />
                <th className="p-2 text-left font-medium">Date</th>
                <th className="p-2 text-left font-medium">Activity</th>
                <th className="p-2 text-right font-medium">Distance (mi)</th>
                <th className="p-2 text-right font-medium">Time</th>
                <th className="p-2 text-right font-medium">Pace (min/mi)</th>
                <th className="p-2 text-right font-medium">Avg HR (bpm)</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-b transition-colors hover:bg-sand/20">
                  <td className="p-2 text-center" aria-hidden>
                    {activityTypeIcon(a.activityType)}
                  </td>
                  <td className="p-2 whitespace-nowrap">{formatDisplayDate(a.startTimeGmt)}</td>
                  <td className="p-2">
                    <Link href={`/activities/${a.id}`} className="font-medium hover:underline">
                      {a.activityName}
                    </Link>
                  </td>
                  <td className="p-2 text-right">{a.distance ? (a.distance / METERS_PER_MILE).toFixed(1) : '—'}</td>
                  <td className="p-2 text-right">{formatDuration(a.durationSeconds)}</td>
                  <td className="p-2 text-right">{paceMinPerMile(a.distance, a.durationSeconds) ?? '—'}</td>
                  <td className="p-2 text-right">{a.avgHeartRate ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
