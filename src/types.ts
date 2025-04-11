// src/types.ts

// Interface for the tracking data sent to the backend
export interface TrackingData {
  functionName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  modelName?: string; // Optional: Which model was used
  timestamp: string; // ISO string format
  metadata?: Record<string, any>; // Optional: Any other relevant metadata (userId, sessionId, etc.)
}

// Interface for the options passed to the HOF
export interface LLMTrackerOptions {
  functionName: string;
  trackerApiUrl: string; // URL of your backend tracking API
  apiKey?: string; // Optional: API key for authenticating with your tracker API
  metadata?: Record<string, any>; // Optional: Additional metadata to send
  // Optional: Custom function to extract token usage if the LLM response structure is non-standard
  // It should return an object { inputTokens: number, outputTokens: number }
  tokenExtractor?: (response: any) => {
    inputTokens: number;
    outputTokens: number;
  };
  // Optional: Custom function to extract model name
  modelExtractor?: (response: any) => string | undefined;
}
