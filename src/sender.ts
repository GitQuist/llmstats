import type { TrackingData } from "./types";

/**
 * Sends tracking data to the specified API endpoint.
 * @param apiUrl - The URL of the tracking API.
 * @param data - The tracking data payload.
 * @param apiKey - Optional API key for authentication.
 */
export async function sendTrackingData(
  apiUrl: string,
  data: TrackingData,
  apiKey?: string
): Promise<void> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`; // Example: Bearer token auth
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      // Log detailed error if the API responds with non-OK status
      const errorBody = await response.text();
      console.error(
        `LLM Tracker: API request failed with status ${response.status}. URL: ${apiUrl}, Body: ${errorBody}`
      );
      // Throw an error to be caught by the caller (in withLLMTracking)
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    // Optional: Log success confirmation for debugging
    // console.log("LLM Tracker: Tracking data sent successfully.");
  } catch (error) {
    // Catch network errors or errors during the fetch operation
    console.error(
      `LLM Tracker: Network or fetch error sending tracking data to ${apiUrl}.`,
      error
    );
    // Re-throw the error to be caught by the caller
    throw error;
  }
}
