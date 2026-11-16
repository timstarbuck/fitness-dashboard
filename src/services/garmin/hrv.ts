import { getGarminToken } from './token';

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
  createTimeStamp: string;
}

export interface GarminHRVReading {
  hrvValue: number;
  readingTimeGMT: string;
  readingTimeLocal: string;
}

export interface GarminHRVResponse {
  userProfilePk: number;
  hrvSummary: GarminHRVSummary;
  hrvReadings: GarminHRVReading[];
  startTimestampGMT: string;
  endTimestampGMT: string;
  startTimestampLocal: string;
  endTimestampLocal: string;
  sleepStartTimestampGMT: string;
  sleepEndTimestampGMT: string;
  sleepStartTimestampLocal: string;
  sleepEndTimestampLocal: string;
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

    try {
      const jsonData = JSON.parse(responseText);
      return jsonData as GarminHRVResponse;
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }
  } catch (error) {
    console.error(`Error fetching HRV data for ${date}:`, error);
    throw new Error(
      `Failed to fetch HRV data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Helper function to parse Garmin date strings (YYYY-MM-DD HH:mm:ss)
export function parseGarminDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value.trim().replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime()) ? null : date;
}

// Helper function to parse Garmin date strings or return undefined
export function parseGarminDateOrUndefined(value?: string): Date | undefined {
  const parsed = parseGarminDate(value);
  return parsed === null ? undefined : parsed;
}