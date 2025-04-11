import type { LLMTrackerOptions } from "./types";
import { withLLMTracking } from "./index";

/**
 * Creates a factory for LLM tracking wrappers with pre-configured options.
 * This allows you to set common options once and reuse them across your application.
 *
 * @param baseOptions The common options to use for all tracking wrappers.
 * @returns A factory function that creates tracking wrappers with the base options pre-configured.
 */
export function createLLMTracker(
  baseOptions: Omit<LLMTrackerOptions, "functionName">
) {
  /**
   * Creates a tracking wrapper with the pre-configured options.
   *
   * @template TArgs - Type for the first argument of the original function (typically an options object).
   * @template TResult - Return type of the original function.
   * @param originalFunction - The async function to wrap (e.g., an LLM API call).
   * @param specificOptions - Additional options specific to this function. These will override any overlapping base options.
   * @returns A wrapped function with tracking enabled that can optionally accept runtime metadata.
   */
  return function createTrackingWrapper<TArgs, TResult>(
    originalFunction: (args: TArgs) => Promise<TResult>,
    specificOptions: Partial<LLMTrackerOptions> & { functionName: string }
  ): {
    // Method 1: Standard call (original function signature)
    (args: TArgs): Promise<TResult>;
    // Method 2: Call with runtime metadata
    (args: TArgs, runtimeMetadata: Record<string, any>): Promise<TResult>;
  } {
    // Create a function that accepts both the original signature and the runtime metadata
    function wrappedWithMetadata(
      args: TArgs,
      runtimeMetadata?: Record<string, any>
    ): Promise<TResult> {
      // Merge metadata from all sources
      const mergedMetadata = {
        ...baseOptions.metadata,
        ...specificOptions.metadata,
        ...(runtimeMetadata || {}),
      };

      // Create a wrapped function with all options merged
      return withLLMTracking(
        (a: TArgs) => originalFunction(a), // Wrap original function to ensure proper typing
        {
          ...baseOptions,
          ...specificOptions,
          metadata: mergedMetadata,
        }
      )(args);
    }

    // Return the wrapped function
    return wrappedWithMetadata;
  };
}
