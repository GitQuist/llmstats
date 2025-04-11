// llm-tracker/src/index.ts

import type { TrackingData, LLMTrackerOptions } from "./types";
import { sendTrackingData } from "./sender";
import {
  openAITokenExtractor,
  openAIModelExtractor,
} from "./extractors/openai";

// Export types, extractors, and factory
export * from "./types";
export * from "./extractors";
export * from "./factory";

/**
 * Wraps an asynchronous function (typically an LLM API call) to track usage and metadata.
 *
 * @template TArgs - Tuple type for the arguments of the original function.
 * @template TResult - Return type of the original function.
 * @param originalFunction - The async function to wrap (e.g., an SDK call like `openai.chat.completions.create` or `generateText`).
 * @param options - Configuration options for the tracker, including API URL, function name, and optional custom extractors.
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
      // Use provided extractor or default to OpenAI's structure
      const tokenExtractor = options.tokenExtractor ?? openAITokenExtractor;
      const { inputTokens, outputTokens } = tokenExtractor(result);
      const totalTokens = inputTokens + outputTokens;

      // --- 3. Extract Model Name ---
      // Use provided extractor or default to OpenAI's structure
      const modelExtractor = options.modelExtractor ?? openAIModelExtractor;
      const extractedModelName = modelExtractor(result);

      // --- 4. Prepare Tracking Data ---
      // Prioritize model name from metadata if provided (useful for AI SDK where model isn't in response)
      const modelName = options.metadata?.modelName ?? extractedModelName;

      const trackingData: TrackingData = {
        functionName: options.functionName,
        inputTokens,
        outputTokens,
        totalTokens,
        modelName,
        timestamp: new Date().toISOString(),
        metadata: {
          // Include user-provided metadata, removing modelName if we already used it
          ...(options.metadata &&
            Object.fromEntries(
              Object.entries(options.metadata).filter(
                ([key]) => key !== "modelName"
              )
            )),
          durationMs, // Add call duration
          // Potentially add parts of the input args if needed (be careful with sensitive data!)
          // inputArgsSnapshot: JSON.stringify(args).substring(0, 200) // Example: Limited snapshot
        },
      };

      // --- 5. Send Data to Backend (Fire and Forget) ---
      sendTrackingData(
        options.trackerApiUrl,
        trackingData,
        options.apiKey
      ).catch((error) => {
        // Log errors but don't let tracking failure break the main flow
        console.error(
          `LLM Tracker: Failed to send tracking data for '${options.functionName}'.`,
          error
        );
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
