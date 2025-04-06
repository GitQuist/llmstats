interface LLMTrackerOptions {
    functionName: string;
    trackerApiUrl: string;
    apiKey?: string;
    metadata?: Record<string, any>;
    tokenExtractor?: (response: any) => {
        inputTokens: number;
        outputTokens: number;
    };
    modelExtractor?: (response: any) => string | undefined;
}
/**
 * Wraps an asynchronous function (typically an LLM API call) to track token usage.
 *
 * @template TArgs - Tuple type for the arguments of the original function.
 * @template TResult - Return type of the original function.
 * @param originalFunction - The async function to wrap (e.g., an SDK call like `openai.chat.completions.create`).
 * @param options - Configuration options for the tracker.
 * @returns A new async function with the same signature as the original, but with tracking enabled.
 */
export declare function withLLMTracking<TArgs extends any[], TResult>(originalFunction: (...args: TArgs) => Promise<TResult>, options: LLMTrackerOptions): (...args: TArgs) => Promise<TResult>;
export {};
