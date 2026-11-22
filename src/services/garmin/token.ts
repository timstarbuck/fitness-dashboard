interface GarminTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export async function getGarminToken(): Promise<string> {
  const apiKey = process.env.GARMIN_API_KEY;
  if (!apiKey) {
    throw new Error('GARMIN_API_KEY is not defined in environment variables');
  }

  const url = 'https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle rate limit errors (429)
      if (response.status === 429) {
        const errorData = JSON.parse(errorText);
        const retryInSeconds = errorData.retryInSeconds || 30;
        throw new Error(`Rate limit exceeded! Retry in ${retryInSeconds} seconds - ${errorText}`);
      }
      
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    // The endpoint returns the access token as a raw JWT (plain text).
    // Some responses may be JSON ({access_token, ...}); handle both shapes.
    const body = (await response.text()).trim();
    if (body.startsWith('{')) {
      const data = JSON.parse(body) as GarminTokenResponse;
      return data.access_token;
    }
    return body;
  } catch (error) {
    console.error('Error fetching Garmin token:', error);
    throw new Error(`Failed to fetch Garmin token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}