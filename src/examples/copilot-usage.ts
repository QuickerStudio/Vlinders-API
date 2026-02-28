/**
 * Example usage of Copilot Responses API client
 */

import { CopilotClient } from '../services/copilot';
import { ChatCompletionRequest } from '../types/chat';

// Initialize Copilot client
const copilotClient = new CopilotClient({
  baseURL: 'https://api.githubcopilot.com',
  token: process.env.COPILOT_TOKEN || '',
  modelFamily: 'gpt-5.3-codex-spark-preview',
  modelMaxPromptTokens: 128000,
  enableContextManagement: true,
  enableReasoning: true,
  reasoningEffort: 'medium',
  reasoningSummary: 'auto',
  enableTruncation: false,
});

/**
 * Example: Non-streaming request
 */
async function exampleNonStreaming() {
  const request: ChatCompletionRequest = {
    model: 'gpt-5.3-codex-spark-preview',
    messages: [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: 'You are a helpful coding assistant.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Write a function to calculate fibonacci numbers.',
          },
        ],
      },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  };

  try {
    const response = await copilotClient.createResponse(request);
    console.log('Response:', response.choices[0].message);
    console.log('Usage:', response.usage);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example: Streaming request
 */
async function exampleStreaming() {
  const request: ChatCompletionRequest = {
    model: 'gpt-5.3-codex-spark-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Explain how async/await works in JavaScript.',
          },
        ],
      },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  };

  try {
    console.log('Streaming response:');
    for await (const chunk of copilotClient.createResponseStream(request)) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        process.stdout.write(delta.content);
      }
    }
    console.log('\n\nStreaming completed.');
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example: Request with tools
 */
async function exampleWithTools() {
  const request: ChatCompletionRequest = {
    model: 'gpt-5.3-codex-spark-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'What is the weather in San Francisco?',
          },
        ],
      },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get the current weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and state, e.g. San Francisco, CA',
              },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'The temperature unit',
              },
            },
            required: ['location'],
          },
        },
      },
    ],
    tool_choice: 'auto',
    max_tokens: 1000,
  };

  try {
    const response = await copilotClient.createResponse(request);
    const message = response.choices[0].message;

    if (message.tool_calls) {
      console.log('Tool calls:', message.tool_calls);
      // Handle tool calls here
    } else {
      console.log('Response:', message.content);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example: Multi-turn conversation with context management
 */
async function exampleMultiTurn() {
  const messages: ChatCompletionRequest['messages'] = [
    {
      role: 'system',
      content: [
        {
          type: 'text',
          text: 'You are a helpful assistant.',
        },
      ],
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'What is TypeScript?',
        },
      ],
    },
  ];

  try {
    // First turn
    let response = await copilotClient.createResponse({
      model: 'gpt-5.3-codex-spark-preview',
      messages,
      max_tokens: 500,
    });

    console.log('Turn 1:', response.choices[0].message);

    // Add assistant response to messages
    messages.push(response.choices[0].message);

    // Second turn
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Can you give me an example?',
        },
      ],
    });

    response = await copilotClient.createResponse({
      model: 'gpt-5.3-codex-spark-preview',
      messages,
      max_tokens: 500,
    });

    console.log('Turn 2:', response.choices[0].message);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    console.log('=== Non-streaming Example ===');
    await exampleNonStreaming();

    console.log('\n=== Streaming Example ===');
    await exampleStreaming();

    console.log('\n=== Tools Example ===');
    await exampleWithTools();

    console.log('\n=== Multi-turn Example ===');
    await exampleMultiTurn();
  })();
}
