// llm-tracker/src/index.ts

// --- Configuration ---

// Interface for the tracking data sent to the backend
interface TrackingData {
  functionName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  modelName?: string; // Optional: Which model was used
  timestamp: string; // ISO string format
  metadata?: Record<string, any>; // Optional: Any other relevant metadata (userId, sessionId, etc.)
}

// Interface for the options passed to the HOF
interface LLMTrackerOptions {
  functionName: string;
  trackerApiUrl: string; // URL of your backend tracking API - Removed for console logging
  apiKey?: string; // Optional: API key for authenticating with your tracker API - Removed
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

// --- Default Extractors (Assuming OpenAI-like structure) ---

const defaultTokenExtractor = (
  response: any
): { inputTokens: number; outputTokens: number } => {
  if (
    response?.usage?.prompt_tokens !== undefined &&
    response?.usage?.completion_tokens !== undefined
  ) {
    return {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
    };
  }
  // Add more default extraction logic for other common LLM providers if needed
  console.warn(
    "LLM Tracker: Could not automatically extract token usage. Response structure might be unexpected or missing 'usage' field. Provide a custom 'tokenExtractor'.",
    response
  );
  return { inputTokens: 0, outputTokens: 0 }; // Default if extraction fails
};

const defaultModelExtractor = (response: any): string | undefined => {
  return response?.model; // Common field in OpenAI responses
};

// --- The Higher-Order Function (HOF) ---

/**
 * Wraps an asynchronous function (typically an LLM API call) to track token usage.
 *
 * @template TArgs - Tuple type for the arguments of the original function.
 * @template TResult - Return type of the original function.
 * @param originalFunction - The async function to wrap (e.g., an SDK call like `openai.chat.completions.create`).
 * @param options - Configuration options for the tracker.
 * @returns A new async function with the same signature as the original, but with tracking enabled.
 */
export function withLLMTracking<TArgs extends any[], TResult>(
  originalFunction: (...args: TArgs) => Promise<TResult>,
  options: LLMTrackerOptions
): (...args: TArgs) => Promise<TResult> {
  // Return the wrapped async function
  return async (...args: TArgs): Promise<TResult> => {
    const startTime = Date.now();

    try {
      // --- 1. Execute the original LLM function ---
      const result = await originalFunction(...args);
      const endTime = Date.now();
      const durationMs = endTime - startTime;

      // --- 2. Extract Token Usage ---
      const extractor = options.tokenExtractor ?? defaultTokenExtractor;
      const { inputTokens, outputTokens } = extractor(result);
      const totalTokens = inputTokens + outputTokens;

      // --- 3. Extract Model Name ---
      const modelExtractor = options.modelExtractor ?? defaultModelExtractor;
      const modelName = modelExtractor(result);

      // --- 4. Prepare Tracking Data ---
      const trackingData: TrackingData = {
        functionName: options.functionName,
        inputTokens,
        outputTokens,
        totalTokens,
        modelName,
        timestamp: new Date().toISOString(),
        metadata: {
          ...options.metadata, // Include user-provided metadata
          durationMs, // Add call duration
          // Potentially add parts of the input args if needed (be careful with sensitive data!)
          // inputArgsSnapshot: JSON.stringify(args).substring(0, 200) // Example: Limited snapshot
        },
      };

      // ---5. Send Data to Backend (Fire and Forget) ---

      sendTrackingData(
        options.trackerApiUrl,
        trackingData,
        options.apiKey
      ).catch((error) => {
        // Log errors but don't let tracking failure break the main flow
        console.error("LLM Tracker: Failed to send tracking data.", error);
      });

      // --- 6. Return the original result ---
      return result;
    } catch (error) {
      // If the original function throws an error, log it and re-throw
      console.error(
        `LLM Tracker: Error occurred in tracked function '${options.functionName}'.`,
        error
      );
      // Optionally send error information to the tracking backend as well
      // sendErrorData(options.trackerApiUrl, options.functionName, error, options.apiKey);
      throw error; // Re-throw the original error
    }
  };
}

// --- Helper Function to Send Data ---
async function sendTrackingData(
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

// --- Example Usage (How a developer would use it) ---
/*
// Assume you have an OpenAI client initialized
// import OpenAI from 'openai';
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Your original function making the LLM call
async function generateBlogPost(topic: string): Promise<any> {
    console.log(`Generating blog post about: ${topic}`);
    const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: `Write a short blog post about ${topic}` }],
        model: 'gpt-3.5-turbo',
        // Ensure 'usage' is included in the response by the SDK/API
    });
    console.log("API Call successful.");
    return completion; // Return the full response object including 'usage'
}

// Wrap the function with the tracker
const trackedGenerateBlogPost = withLLMTracking(generateBlogPost, {
    functionName: 'generateBlogPost', // Identifier for this function
    // trackerApiUrl: 'http://localhost:3001/track', // Removed - Not needed for console logging
    // apiKey: 'YOUR_TRACKER_API_KEY', // Removed - Not needed for console logging
    metadata: { // Optional extra info
        userId: 'user-123',
        feature: 'blog-generation-v1'
    }
});

// Call the tracked function as usual
async function main() {
    try {
        const result = await trackedGenerateBlogPost('the future of AI');
        console.log("Blog post generation complete. Tracking data logged to console.");
        // console.log("LLM Response:", result); // You still get the original result
    } catch (error) {
        console.error("Failed to generate blog post:", error);
    }
}

main();
*/
