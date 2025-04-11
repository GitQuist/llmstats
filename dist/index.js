"use strict";
// llm-tracker/src/index.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withLLMTracking = withLLMTracking;
// --- Default Extractors (Assuming OpenAI-like structure) ---
const defaultTokenExtractor = (response) => {
    var _a, _b;
    if (((_a = response === null || response === void 0 ? void 0 : response.usage) === null || _a === void 0 ? void 0 : _a.prompt_tokens) !== undefined &&
        ((_b = response === null || response === void 0 ? void 0 : response.usage) === null || _b === void 0 ? void 0 : _b.completion_tokens) !== undefined) {
        return {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
        };
    }
    // Add more default extraction logic for other common LLM providers if needed
    console.warn("LLM Tracker: Could not automatically extract token usage. Response structure might be unexpected or missing 'usage' field. Provide a custom 'tokenExtractor'.", response);
    return { inputTokens: 0, outputTokens: 0 }; // Default if extraction fails
};
const defaultModelExtractor = (response) => {
    return response === null || response === void 0 ? void 0 : response.model; // Common field in OpenAI responses
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
function withLLMTracking(originalFunction, options) {
    // Return the wrapped async function
    return (...args) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const startTime = Date.now();
        try {
            // --- 1. Execute the original LLM function ---
            const result = yield originalFunction(...args);
            const endTime = Date.now();
            const durationMs = endTime - startTime;
            // --- 2. Extract Token Usage ---
            const extractor = (_a = options.tokenExtractor) !== null && _a !== void 0 ? _a : defaultTokenExtractor;
            const { inputTokens, outputTokens } = extractor(result);
            const totalTokens = inputTokens + outputTokens;
            // --- 3. Extract Model Name ---
            const modelExtractor = (_b = options.modelExtractor) !== null && _b !== void 0 ? _b : defaultModelExtractor;
            const modelName = modelExtractor(result);
            // --- 4. Prepare Tracking Data ---
            const trackingData = {
                functionName: options.functionName,
                inputTokens,
                outputTokens,
                totalTokens,
                modelName,
                timestamp: new Date().toISOString(),
                metadata: Object.assign(Object.assign({}, options.metadata), { // Include user-provided metadata
                    durationMs }),
            };
            // ---5. Send Data to Backend (Fire and Forget) ---
            sendTrackingData(options.trackerApiUrl, trackingData, options.apiKey).catch((error) => {
                // Log errors but don't let tracking failure break the main flow
                console.error("LLM Tracker: Failed to send tracking data.", error);
            });
            // --- 6. Return the original result ---
            return result;
        }
        catch (error) {
            // If the original function throws an error, log it and re-throw
            console.error(`LLM Tracker: Error occurred in tracked function '${options.functionName}'.`, error);
            // Optionally send error information to the tracking backend as well
            // sendErrorData(options.trackerApiUrl, options.functionName, error, options.apiKey);
            throw error; // Re-throw the original error
        }
    });
}
// --- Helper Function to Send Data ---
function sendTrackingData(apiUrl, data, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const headers = {
                "Content-Type": "application/json",
            };
            if (apiKey) {
                headers["Authorization"] = `Bearer ${apiKey}`; // Example: Bearer token auth
            }
            const response = yield fetch(apiUrl, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                // Log detailed error if the API responds with non-OK status
                const errorBody = yield response.text();
                console.error(`LLM Tracker: API request failed with status ${response.status}. URL: ${apiUrl}, Body: ${errorBody}`);
                // Throw an error to be caught by the caller (in withLLMTracking)
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            // Optional: Log success confirmation for debugging
            // console.log("LLM Tracker: Tracking data sent successfully.");
        }
        catch (error) {
            // Catch network errors or errors during the fetch operation
            console.error(`LLM Tracker: Network or fetch error sending tracking data to ${apiUrl}.`, error);
            // Re-throw the error to be caught by the caller
            throw error;
        }
    });
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
