/**
 * Extracts token usage from a Vercel AI SDK response.
 * Assumes the response object (e.g., from `generateText` or `streamText`)
 * contains a `usage` field with `promptTokens` and `completionTokens`.
 */
export const aiSDKTokenExtractor = (
  response: any
): { inputTokens: number; outputTokens: number } => {
  // The AI SDK often returns the full response object which includes the usage
  // Example: { text: '...', toolCalls: [], toolResults: [], finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 20 }, ... }
  if (
    response?.usage?.promptTokens !== undefined &&
    response?.usage?.completionTokens !== undefined
  ) {
    return {
      inputTokens: response.usage.promptTokens,
      outputTokens: response.usage.completionTokens,
    };
  }

  // Add checks for other potential structures if needed, e.g., streaming responses might structure differently

  console.warn(
    "LLM Tracker (AI SDK Extractor): Could not extract token usage. Response structure might be missing 'usage', 'promptTokens', or 'completionTokens'. Provide a custom 'tokenExtractor'.",
    response
  );
  return { inputTokens: 0, outputTokens: 0 }; // Default if extraction fails
};

/**
 * Extracts the model name from a Vercel AI SDK context.
 * The AI SDK typically requires the model to be passed in the initial call,
 * it's not usually part of the response object itself.
 * Recommend passing the model name via `metadata` in `LLMTrackerOptions`.
 */
export const aiSDKModelExtractor = (response: any): string | undefined => {
  // The response object from AI SDK functions like generateText usually doesn't contain the model ID.
  // It's known at the time of calling the function.
  // Returning undefined encourages users to provide it via metadata.
  console.warn(
    "LLM Tracker (AI SDK Extractor): Model name cannot be reliably extracted from the response object. Please provide it via the 'metadata.modelName' option when calling 'withLLMTracking'."
  );
  return undefined;
};
