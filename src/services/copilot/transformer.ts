/**
 * Transformer for converting chat messages to Copilot Responses API format
 */

import {
  ChatMessage,
  ChatCompletionContentPart,
  ChatCompletionContentPartKind,
  ChatMessageToolCall,
} from '../../types/chat';
import {
  ResponseInputItem,
  ResponseInputContent,
  ResponseOutputContent,
  ResponseOutputMessage,
  ResponseFunctionCall,
  ResponseFunctionCallOutput,
  ResponseInputText,
  ResponseInputImage,
  ResponseOutputText,
  ResponseOutputRefusal,
} from '../../types/copilot';
import {
  extractCompactionData,
  extractThinkingData,
  extractPhaseData,
  extractStatefulMarker,
  getLatestCompactionMessageIndex,
} from './contextManager';

/**
 * Transform options
 */
export interface TransformOptions {
  /** Model ID for stateful marker extraction */
  modelId: string;
  /** Whether to ignore stateful markers */
  ignoreStatefulMarker?: boolean;
}

/**
 * Transform result
 */
export interface TransformResult {
  /** Transformed input items */
  input: ResponseInputItem[];
  /** Previous response ID for stateful continuation */
  previous_response_id?: string;
}

/**
 * Transform raw chat messages to Responses API format
 */
export function rawMessagesToResponseAPI(
  messages: readonly ChatMessage[],
  options: TransformOptions
): TransformResult {
  let processedMessages = [...messages];

  // If there's compaction data, start from the latest compaction message
  const latestCompactionIndex = getLatestCompactionMessageIndex(messages);
  if (latestCompactionIndex !== undefined) {
    processedMessages = messages.slice(latestCompactionIndex);
  }

  // Extract stateful marker if not ignored
  let previousResponseId: string | undefined;
  if (!options.ignoreStatefulMarker && latestCompactionIndex === undefined) {
    const statefulMarkerData = extractStatefulMarker(
      options.modelId,
      messages
    );
    if (statefulMarkerData) {
      previousResponseId = statefulMarkerData.marker;
      processedMessages = messages.slice(statefulMarkerData.index + 1);
    }
  }

  // Transform messages to input items
  const input: ResponseInputItem[] = [];

  for (const message of processedMessages) {
    switch (message.role) {
      case 'assistant':
        input.push(...transformAssistantMessage(message));
        break;
      case 'tool':
        input.push(...transformToolMessage(message));
        break;
      case 'user':
        input.push(transformUserMessage(message));
        break;
      case 'system':
        input.push(transformSystemMessage(message));
        break;
    }
  }

  return { input, previous_response_id: previousResponseId };
}

/**
 * Transform assistant message
 */
function transformAssistantMessage(
  message: ChatMessage
): ResponseInputItem[] {
  const items: ResponseInputItem[] = [];

  // Extract and add compaction data
  if (message.content.length > 0) {
    items.push(...extractCompactionData(message.content));
    items.push(...extractThinkingData(message.content));

    // Transform regular content
    const content = message.content
      .map(rawContentToResponsesOutputContent)
      .filter((c): c is ResponseOutputContent => c !== undefined);

    if (content.length > 0) {
      const assistantMessage: ResponseOutputMessage = {
        type: 'message',
        role: 'assistant',
        id: 'msg_123', // Placeholder ID
        status: 'completed',
        content,
        phase: extractPhaseData(message.content),
      };
      items.push(assistantMessage);
    }
  }

  // Transform tool calls
  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      items.push(transformToolCall(toolCall));
    }
  }

  return items;
}

/**
 * Transform tool message
 */
function transformToolMessage(message: ChatMessage): ResponseInputItem[] {
  const items: ResponseInputItem[] = [];

  if (!message.tool_call_id) {
    return items;
  }

  // Extract text content
  const textContent = message.content
    .filter((c) => c.type === ChatCompletionContentPartKind.Text)
    .map((c) => (c as any).text)
    .join('');

  // Extract image content
  const imageContent = message.content
    .filter((c) => c.type === ChatCompletionContentPartKind.Image)
    .map(
      (c): ResponseInputImage => ({
        type: 'input_image',
        detail: (c as any).image_url?.detail || 'auto',
        image_url: (c as any).image_url?.url || '',
      })
    );

  // Add function call output
  items.push({
    type: 'function_call_output',
    call_id: message.tool_call_id,
    output: textContent,
  });

  // Add images as separate user message if present
  if (imageContent.length > 0) {
    items.push({
      role: 'user',
      content: [
        { type: 'input_text', text: 'Image associated with the above tool call:' },
        ...imageContent,
      ],
    });
  }

  return items;
}

/**
 * Transform user message
 */
function transformUserMessage(message: ChatMessage): ResponseInputItem {
  return {
    role: 'user',
    content: message.content
      .map(rawContentToResponsesContent)
      .filter((c): c is ResponseInputContent => c !== undefined),
  };
}

/**
 * Transform system message
 */
function transformSystemMessage(message: ChatMessage): ResponseInputItem {
  return {
    role: 'system',
    content: message.content
      .map(rawContentToResponsesContent)
      .filter((c): c is ResponseInputContent => c !== undefined),
  };
}

/**
 * Transform tool call
 */
function transformToolCall(toolCall: ChatMessageToolCall): ResponseFunctionCall {
  return {
    type: 'function_call',
    name: toolCall.function.name,
    arguments: toolCall.function.arguments,
    call_id: toolCall.id,
  };
}

/**
 * Convert raw content part to Responses API input content
 */
function rawContentToResponsesContent(
  part: ChatCompletionContentPart
): ResponseInputContent | undefined {
  switch (part.type) {
    case ChatCompletionContentPartKind.Text:
      return { type: 'input_text', text: (part as any).text };
    case ChatCompletionContentPartKind.Image:
      return {
        type: 'input_image',
        detail: (part as any).image_url?.detail || 'auto',
        image_url: (part as any).image_url?.url || '',
      };
    case ChatCompletionContentPartKind.Opaque: {
      // Check if it's already a valid input content type
      const value = (part as any).value;
      if (
        value &&
        typeof value === 'object' &&
        (value.type === 'input_text' ||
          value.type === 'input_image' ||
          value.type === 'input_file')
      ) {
        return value as ResponseInputContent;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Convert raw content part to Responses API output content
 */
function rawContentToResponsesOutputContent(
  part: ChatCompletionContentPart
): ResponseOutputContent | undefined {
  switch (part.type) {
    case ChatCompletionContentPartKind.Text:
      const text = (part as any).text;
      if (text && text.trim()) {
        return { type: 'output_text', text, annotations: [] };
      }
      return undefined;
    default:
      return undefined;
  }
}
