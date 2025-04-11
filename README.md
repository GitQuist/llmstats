# LLM Tracker

LLM Tracker is a simple utility for tracking token usage and other metrics when making calls to Large Language Models (LLMs) in JavaScript/TypeScript applications. The tracker wraps your LLM API calls and reports usage statistics to your analytics backend.

## Features

- Track token usage (input, output, total) for LLM API calls
- Integrate with multiple LLM providers through provider-specific extractors
- Send tracking data to your backend API for analytics
- Easily extensible for custom LLM providers
- Zero overhead to your application's performance (fire-and-forget logging)
- Factory pattern for app-wide configuration

## Installation

```bash
npm install llm-tracker
# or
yarn add llm-tracker
# or
pnpm add llm-tracker
```

## Usage

### OpenAI

```typescript
import { withLLMTracking } from "llm-tracker";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Wrap the OpenAI chat completion function
const trackedChatCompletion = withLLMTracking(
  openai.chat.completions.create.bind(openai.chat.completions),
  {
    functionName: "openai.chat.completions.create",
    trackerApiUrl: "https://your-analytics-api.com/track",
    apiKey: "your-analytics-api-key", // Optional
    metadata: {
      // Optional additional data to track
      userId: "user123",
      sessionId: "session456",
    },
  }
);

// Use the tracked function just like the original
async function askQuestion(question) {
  const completion = await trackedChatCompletion({
    model: "gpt-4",
    messages: [{ role: "user", content: question }],
  });

  return completion.choices[0].message.content;
}
```

### Vercel AI SDK

To track token usage with the Vercel AI SDK, use the provided AI SDK extractors:

```typescript
import {
  withLLMTracking,
  aiSDKTokenExtractor,
  aiSDKModelExtractor,
} from "llm-tracker";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// Wrap the AI SDK generateText function
const trackedGenerateText = withLLMTracking(generateText, {
  functionName: "ai.generateText",
  trackerApiUrl: "https://your-analytics-api.com/track",
  apiKey: "your-analytics-api-key", // Optional
  // Use the AI SDK specific extractors
  tokenExtractor: aiSDKTokenExtractor,
  modelExtractor: aiSDKModelExtractor,
  metadata: {
    // Since AI SDK doesn't return the model in the response,
    // you should provide it in metadata
    modelName: "OpenAI/gpt-4",
    userId: "user123",
  },
});

// Use the tracked function just like you would use the original
async function generateResponse(prompt) {
  const { text } = await trackedGenerateText({
    model: openai("gpt-4"),
    prompt: prompt,
  });

  return text;
}
```

### Factory Pattern for App-Wide Configuration

If you're making multiple LLM calls across your application, you can use the factory pattern to create pre-configured tracking wrappers:

```typescript
import { createLLMTracker, aiSDKTokenExtractor } from "llm-tracker";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// Create a factory with common configuration
const createTracker = createLLMTracker({
  trackerApiUrl: "https://your-analytics-api.com/track",
  apiKey: "your-analytics-api-key",
  metadata: {
    appVersion: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  },
});

// Create specific trackers for different functions
const trackedGenerateText = createTracker(generateText, {
  functionName: "ai.generateText",
  tokenExtractor: aiSDKTokenExtractor,
  metadata: {
    service: "text-generation",
  },
});

// Use the tracked function with runtime metadata
async function generateResponse(prompt, userId) {
  const { text } = await trackedGenerateText(
    // First argument: The original function arguments
    {
      model: openai("gpt-4"),
      prompt: prompt,
    },
    // Second argument: Runtime metadata that will be merged with base metadata
    {
      modelName: "gpt-4", // Since AI SDK doesn't include model in response
      userId: userId,
      requestId: `req-${Date.now()}`,
    }
  );

  return text;
}
```

## Advanced Usage

### Custom Extractors

If you're using an LLM provider that isn't directly supported, you can create custom extractors:

```typescript
import { withLLMTracking } from "llm-tracker";

// Create custom extractors for your LLM provider
const customTokenExtractor = (response) => {
  // Your logic to extract input and output tokens
  return {
    inputTokens: response.someField.inputTokenCount,
    outputTokens: response.someField.outputTokenCount,
  };
};

const customModelExtractor = (response) => {
  return response.modelInfo.name;
};

// Use your custom extractors
const trackedLLMCall = withLLMTracking(yourLLMFunction, {
  functionName: "custom.llm.call",
  trackerApiUrl: "https://your-analytics-api.com/track",
  tokenExtractor: customTokenExtractor,
  modelExtractor: customModelExtractor,
});
```

## Supported LLM Providers

LLM Tracker currently includes built-in support for:

- OpenAI API (default)
- Vercel AI SDK

## License

MIT
