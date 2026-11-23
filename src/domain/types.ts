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

/** Sleep row summary (wellness data for the dashboard and recovery pages). */
export interface SleepSummary {
  calendarDate: string; // YYYY-MM-DD (Garmin local date)
  sleepTimeSeconds: number | null;
  deepSleepSeconds: number | null;
  remSleepSeconds: number | null;
  awakeCount: number | null;
  sleepScoreFeedback: string | null;
}

/** HRV row summary (wellness data for the dashboard). */
export interface HrSummary {
  calendarDate: string; // YYYY-MM-DD (Garmin local date)
  weeklyAvg: number | null;
  lastNightAvg: number | null;
  baselineBalancedLow: number | null; // ms — the numeric baseline reference (balanced-zone lower bound)
  baselineMarkerValue: number | null; // normalized chart position (0-1), NOT ms — never use for comparisons
}

/** User daily summary row (wellness data for the dashboard and recovery pages). */
export interface DailySummary {
  calendarDate: string; // YYYY-MM-DD (Garmin local date)
  totalSteps: number | null;
  dailyStepGoal: number | null;
  totalKilocalories: number | null;
  activeKilocalories: number | null;
  restingHeartRate: number | null;
  bodyBatteryMostRecentValue: number | null;
  averageStressLevel: number | null;
  stressQualifier: string | null;
}
