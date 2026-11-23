export interface GarminHRVSummary {
  calendarDate: string;
  weeklyAvg: number;
  lastNightAvg: number;
  lastNight5MinHigh: number;
  baseline: {
    lowUpper: number;
    balancedLow: number;
    balancedUpper: number;
    markerValue: number;
  };
  status: string;
  feedbackPhrase: string;
  // May be omitted by the API; the DTO mapper falls back to the current time.
  createTimeStamp?: string;
}

export interface GarminHRVReading {
  hrvValue: number;
  // Reading timestamps may be omitted by the API; the DTO mapper falls back to now.
  readingTimeGMT?: string;
  readingTimeLocal?: string;
}

export interface GarminHRVResponse {
  userProfilePk: number;
  hrvSummary: GarminHRVSummary;
  hrvReadings: GarminHRVReading[];
  // The window/sleep timestamps may be omitted by the API for some days; the DTO
  // mapper (dto.ts) falls back to the current time when they are missing.
  startTimestampGMT?: string;
  endTimestampGMT?: string;
  startTimestampLocal?: string;
  endTimestampLocal?: string;
  sleepStartTimestampGMT?: string;
  sleepEndTimestampGMT?: string;
  sleepStartTimestampLocal?: string;
  sleepEndTimestampLocal?: string;
}

export async function fetchGarminHRV(
  token: string,
  date: string
): Promise<GarminHRVResponse> {
  const url = `https://personal.connectapi.garmin.com/hrv-service/hrv/${date}`;

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
    return jsonData as GarminHRVResponse;
  } catch (error) {
    console.error(`Error fetching HRV data for ${date}:`, error);
    throw new Error(
      `Failed to fetch HRV data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
