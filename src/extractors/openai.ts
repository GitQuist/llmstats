/**
 * Extracts token usage from an OpenAI-like API response.
 * Assumes the response contains a `usage` object with `prompt_tokens` and `completion_tokens`.
 */
export const openAITokenExtractor = (
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

  console.warn(
    "LLM Tracker (OpenAI Extractor): Could not extract token usage. Response structure might be unexpected or missing 'usage' field. Provide a custom 'tokenExtractor'.",
    response
  );
  return { inputTokens: 0, outputTokens: 0 }; // Default if extraction fails
};

/**
 * Extracts the model name from an OpenAI-like API response.
 * Assumes the response contains a `model` field.
 */
export const openAIModelExtractor = (response: any): string | undefined => {
  return response?.model;
};
