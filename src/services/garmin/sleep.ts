export interface GarminSleepResponse {
  id: number;
  userProfilePK: number;
  // The remaining fields may be omitted by the API for some days. The DTO mapper
  // (dto.ts) normalizes missing values to null before persistence.
  calendarDate?: string;
  sleepTimeSeconds?: number;
  napTimeSeconds?: number;
  sleepWindowConfirmed?: boolean;
  sleepWindowConfirmationType?: string;
  sleepStartTimestampGMT?: string;
  sleepEndTimestampGMT?: string;
  sleepStartTimestampLocal?: string;
  sleepEndTimestampLocal?: string;
  autoSleepStartTimestampGMT?: string;
  autoSleepEndTimestampGMT?: string;
  sleepQualityTypePK?: string;
  sleepResultTypePK?: string;
  unmeasurableSleepSeconds?: number;
  deepSleepSeconds?: number;
  lightSleepSeconds?: number;
  remSleepSeconds?: number;
  awakeSleepSeconds?: number;
  deviceRemCapable?: boolean;
  sleepFromDevice?: boolean;
  averageSpO2Value?: number;
  lowestSpO2Value?: number;
  highestSpO2Value?: number;
  numberOfEventsBelowThreshold?: number;
  averageSpO2HRSleep?: number;
  spo2Threshold?: number;
  averageRespirationValue?: number;
  lowestRespirationValue?: number;
  highestRespirationValue?: number;
  awakeCount?: number;
  avgSleepStress?: number;
  ageGroup?: string;
  avgHeartRate?: number;
  sleepScoreFeedback?: string;
  sleepScoreInsight?: string;
  sleepScorePersonalizedInsight?: string;
  userNote?: string;
  kidSleepNote?: string;
  sleepVersion?: number;
  breathingDisruptionSeverity?: string;
}

export async function fetchGarminSleep(
  token: string,
  date: string
): Promise<GarminSleepResponse> {
  const url = `https://personal.connectapi.garmin.com/sleep-service/sleep/dailySleep?date=${date}`;

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
    return jsonData as GarminSleepResponse;
  } catch (error) {
    console.error(`Error fetching sleep data for ${date}:`, error);
    throw new Error(
      `Failed to fetch sleep data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}