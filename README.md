# LLM Tracker

A Higher-Order Function (HOF) for tracking Large Language Model (LLM) usage and token consumption.

## Overview

LLM Tracker is a utility designed to wrap around asynchronous functions that make LLM API calls, tracking their token usage and other relevant metadata. It provides a flexible way to monitor and log LLM interactions, supporting various LLM providers with customizable extraction logic.

## Installation

To install LLM Tracker, run the following command in your project directory:

```bash
npm install llm-tracker
```

## Usage

Here's a basic example of how to use LLM Tracker with an OpenAI client:

```typescript
import OpenAI from "openai";
import { withLLMTracking } from "llm-tracker";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateBlogPost(topic: string): Promise<any> {
  console.log(`Generating blog post about: ${topic}`);
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "user", content: `Write a short blog post about ${topic}` },
    ],
    model: "gpt-4o",
  });
  console.log("API Call successful.");
  return completion;
}

const trackedGenerateBlogPost = withLLMTracking(generateBlogPost, {
  functionName: "generateBlogPost",
  trackerApiUrl: "https://your-tracking-api.com/track",
  metadata: {
    userId: "user-123",
    feature: "blog-generation-v1",
  },
});

async function main() {
  try {
    const result = await trackedGenerateBlogPost("the future of AI");
    console.log("Blog post generation complete. Tracking data logged.");
  } catch (error) {
    console.error("Failed to generate blog post:", error);
  }
}

main();
```

## Configuration Options

The `withLLMTracking` HOF accepts an options object with the following properties:

- `functionName`: Identifier for the tracked function.
- `trackerApiUrl`: URL of your backend tracking API.
- `apiKey`: Optional API key for authenticating with your tracker API.
- `metadata`: Optional additional metadata to include in tracking data.
- `tokenExtractor`: Optional custom function to extract token usage from LLM responses.
- `modelExtractor`: Optional custom function to extract the model name from LLM responses.

## Features

- Tracks input tokens, output tokens, and total tokens used by LLM API calls.
- Extracts model name from LLM responses.
- Supports customizable token and model extraction logic.
- Logs tracking data to the console and optionally sends it to a specified backend API.

## Contributing

Contributions to LLM Tracker are welcome. Please submit issues and pull requests on the project's GitHub repository.
