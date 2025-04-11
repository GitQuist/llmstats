// Example of using the factory pattern with llm-tracker
import {
  createLLMTracker,
  aiSDKTokenExtractor,
  aiSDKModelExtractor,
} from "../src";
import { generateText, generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import OpenAI from "openai";

// Initialize OpenAI client
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Step 1: Create a factory with common configuration
const createTracker = createLLMTracker({
  trackerApiUrl: "https://your-analytics-api.com/track",
  apiKey: "your-analytics-api-key",
  metadata: {
    appVersion: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    // Common metadata for all LLM calls
  },
});

// Step 2: Create specific trackers for different LLM functions
// A. Vercel AI SDK with OpenAI
const trackedGenerateText = createTracker(generateText, {
  functionName: "ai.generateText",
  tokenExtractor: aiSDKTokenExtractor,
  modelExtractor: aiSDKModelExtractor,
  metadata: {
    service: "text-generation",
    // Function-specific metadata
  },
});

// B. Vercel AI SDK with Anthropic
const trackedGenerateObject = createTracker(generateObject, {
  functionName: "ai.generateObject",
  tokenExtractor: aiSDKTokenExtractor,
  modelExtractor: aiSDKModelExtractor,
  metadata: {
    service: "structured-output",
    // Function-specific metadata
  },
});

// C. Direct OpenAI API call
const trackedChatCompletion = createTracker(
  openaiClient.chat.completions.create.bind(openaiClient.chat.completions),
  {
    functionName: "openai.chat.completions",
    // Using default OpenAI extractors
    metadata: {
      service: "chat-api",
      // Function-specific metadata
    },
  }
);

// Example usage
async function main() {
  try {
    // Example 1: AI SDK generateText with model metadata added at call time
    console.log("Generating text with OpenAI via AI SDK...");
    const result = await trackedGenerateText(
      {
        model: openai("gpt-4"),
        prompt: "Explain quantum computing in simple terms",
      },
      {
        // Runtime metadata - merged with the base and function-specific metadata
        modelName: "gpt-4", // Required for AI SDK since model info isn't in the response
        userId: "user-123",
        requestId: "req-456",
      }
    );
    console.log("AI SDK Result:", result.text);

    // Example 2: AI SDK generateObject
    type Product = {
      name: string;
      description: string;
      price: number;
      features: string[];
    };
    console.log("\nGenerating structured object with Anthropic...");
    const productResult = await trackedGenerateObject<Product>(
      {
        model: anthropic("claude-3-opus-20240229"),
        prompt: "Generate a product description for a new smartphone",
      },
      {
        modelName: "claude-3-opus-20240229",
        userId: "user-123",
        requestId: "req-789",
      }
    );
    console.log("Product:", productResult.object);

    // Example 3: Direct OpenAI API
    console.log("\nGenerating chat completion with OpenAI API...");
    const chatResult = await trackedChatCompletion(
      {
        model: "gpt-4",
        messages: [{ role: "user", content: "What is the meaning of life?" }],
      },
      {
        userId: "user-123",
        requestId: "req-101112",
      }
    );
    console.log("Chat Result:", chatResult.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
main().catch(console.error);

// Note: The examples above assume you've added a method overload to your trackers
// to accept runtime metadata. You would need to modify the factory.ts implementation
// to support this pattern for passing runtime metadata.
