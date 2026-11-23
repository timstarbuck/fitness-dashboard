export interface GarminSplit {
  splitNumber: number;
  distance: number;
  duration: number;
  avgSpeed?: number;
}

export interface GarminActivity {
  activityId: number;
  activityName: string;
  description?: string;
  // Dates are "YYYY-MM-DD HH:mm:ss" strings without a timezone designator.
  // Note the all-caps GMT in the field names, as returned by the API.
  startTimeLocal?: string; // user's local time
  startTimeGMT?: string; // UTC
  endTimeGMT?: string; // UTC
  activityType: {
    typeId: number;
    typeKey: string;
    parentTypeId: number;
  };
  eventType?: {
    typeId: number;
    typeKey: string;
  };
  distance: number;
  duration: number;
  elevationGain?: number;
  elevationLoss?: number;
  averageHR?: number;
  maxHR?: number;
  calories: number;
  averageSpeed?: number;
  maxSpeed?: number;
  splits?: GarminSplit[];
}

export interface ActivityDateRange {
  /** Inclusive earliest activity start date (local), "YYYY-MM-DD". */
  startDate?: string;
  /** Inclusive latest activity start date (local), "YYYY-MM-DD". */
  endDate?: string;
}

export async function fetchGarminActivities(
  token: string,
  range?: ActivityDateRange
): Promise<GarminActivity[]> {
  const baseUrl = 'https://personal.connectapi.garmin.com/activitylist-service/activities/search/activities';

  const params = new URLSearchParams();
  if (range?.startDate) params.set('startDate', range.startDate);
  if (range?.endDate) params.set('endDate', range.endDate);
  const url = params.toString() ? `${baseUrl}?${params}` : baseUrl;

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

    return await response.json() as GarminActivity[];
  } catch (error) {
    console.error('Error fetching Garmin activities:', error);
    throw new Error(`Failed to fetch Garmin activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function fetchGarminActivityDetails(
  token: string,
  activityId: number
): Promise<GarminActivity> {
  const url = `https://personal.connectapi.garmin.com/activity-service/activity/${activityId}`;

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

    return await response.json() as GarminActivity;
  } catch (error) {
    console.error(`Error fetching detailed activity ${activityId}:`, error);
    throw new Error(`Failed to fetch Garmin activity details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}