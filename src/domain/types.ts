// ---------------------------------------------------------------------------
// Domain model types shared by the domain layer and the repositories.
// These are hand-written projections of the database rows (the repositories'
// SELECT column sets produce exactly these shapes).
// ---------------------------------------------------------------------------

/** Activity row without the (large) rawPayload jsonb — used for lists, KPIs and charts. */
export interface ActivitySummary {
  id: string;
  activityName: string;
  activityType: string;
  startTimeGmt: Date;
  distance: number;
  durationSeconds: number;
  elevationGain: number | null;
  elevationLoss: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
}

/** Sleep row summary (wellness data for the dashboard). */
export interface SleepSummary {
  calendarDate: string; // YYYY-MM-DD (Garmin local date)
  sleepTimeSeconds: number | null;
}

/** HRV row summary (wellness data for the dashboard). */
export interface HrSummary {
  calendarDate: string; // YYYY-MM-DD (Garmin local date)
  weeklyAvg: number | null;
  lastNightAvg: number | null;
  baselineBalancedLow: number | null;
  baselineMarkerValue: number | null;
}
