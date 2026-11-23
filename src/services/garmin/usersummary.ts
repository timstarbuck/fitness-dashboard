/**
 * Raw shape of the Garmin usersummary daily endpoint response. Most fields may
 * be omitted by the API for some days; the DTO mapper (dto.ts) normalizes
 * missing values to null before persistence.
 */
export interface GarminUserDailySummaryResponse {
  userProfileId?: number;
  userDailySummaryId?: number;
  uuid?: string;
  calendarDate?: string; // YYYY-MM-DD (Garmin local date)
  wellnessStartTimeGmt?: string;
  wellnessStartTimeLocal?: string;
  wellnessEndTimeGmt?: string;
  wellnessEndTimeLocal?: string;
  durationInMilliseconds?: number;
  wellnessDescription?: string;

  // Calories
  totalKilocalories?: number;
  activeKilocalories?: number;
  bmrKilocalories?: number;
  consumedKilocalories?: number;
  remainingKilocalories?: number;

  // Steps & distance
  totalSteps?: number;
  dailyStepGoal?: number;
  totalDistanceMeters?: number;
  wellnessDistanceMeters?: number;

  // Activity time (seconds)
  highlyActiveSeconds?: number;
  activeSeconds?: number;
  sedentarySeconds?: number;
  sleepingSeconds?: number;

  // Intensity & floors
  moderateIntensityMinutes?: number;
  vigorousIntensityMinutes?: number;
  intensityMinutesGoal?: number;
  floorsAscendedInMeters?: number;
  floorsDescendedInMeters?: number;
  floorsAscended?: number;
  floorsDescended?: number;
  userFloorsAscendedGoal?: number;

  // Heart rate
  minHeartRate?: number;
  maxHeartRate?: number;
  restingHeartRate?: number;
  lastSevenDaysAvgRestingHeartRate?: number;
  minAvgHeartRate?: number;
  maxAvgHeartRate?: number;

  // Stress (levels, durations in seconds, percentages)
  averageStressLevel?: number;
  maxStressLevel?: number;
  stressDuration?: number;
  restStressDuration?: number;
  activityStressDuration?: number;
  uncategorizedStressDuration?: number;
  totalStressDuration?: number;
  lowStressDuration?: number;
  mediumStressDuration?: number;
  highStressDuration?: number;
  stressPercentage?: number;
  restStressPercentage?: number;
  activityStressPercentage?: number;
  uncategorizedStressPercentage?: number;
  lowStressPercentage?: number;
  mediumStressPercentage?: number;
  highStressPercentage?: number;
  stressQualifier?: string;

  // Sleep/awake (seconds)
  measurableAwakeDuration?: number;
  measurableAsleepDuration?: number;

  // Body battery (0-100)
  bodyBatteryChargedValue?: number;
  bodyBatteryDrainedValue?: number;
  bodyBatteryHighestValue?: number;
  bodyBatteryLowestValue?: number;
  bodyBatteryMostRecentValue?: number;
  bodyBatteryDuringSleep?: number;
  bodyBatteryAtWakeTime?: number;
  bodyBatteryVersion?: number;

  // SpO2, respiration & environment
  abnormalHeartRateAlertsCount?: number;
  averageSpo2?: number;
  lowestSpo2?: number;
  latestSpo2?: number;
  latestSpo2ReadingTimeGmt?: string;
  latestSpo2ReadingTimeLocal?: string;
  averageMonitoringEnvironmentAltitude?: number;
  avgWakingRespirationValue?: number;
  highestRespirationValue?: number;
  lowestRespirationValue?: number;
  latestRespirationValue?: number;
  latestRespirationTimeGMT?: string;

  // Flags & metadata
  includesWellnessData?: boolean;
  includesActivityData?: boolean;
  includesCalorieConsumedData?: boolean;
  source?: string;
  lastSyncTimestampGMT?: string;
}

export async function fetchGarminUserDailySummary(
  token: string,
  date: string
): Promise<GarminUserDailySummaryResponse> {
  const url = `https://personal.connectapi.garmin.com/usersummary-service/usersummary/daily?calendarDate=${date}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();

    // Check if the response is empty or invalid JSON
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from Garmin API');
    }

    const jsonData = JSON.parse(responseText);
    return jsonData as GarminUserDailySummaryResponse;
  } catch (error) {
    console.error(`Error fetching user daily summary for ${date}:`, error);
    throw new Error(
      `Failed to fetch user daily summary: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
