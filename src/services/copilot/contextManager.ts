/**
 * Context management for Copilot Responses API
 * Handles compaction data, stateful markers, and thinking data extraction
 */

import {
  ChatMessage,
  ChatCompletionContentPart,
  ChatCompletionContentPartKind,
} from '../../types/chat';
import {
  ContextManagementResponse,
  StatefulMarkerWithModel,
  ThinkingData,
  CustomDataPartMimeTypes,
  StatefulMarkerContainer,
  ThinkingDataContainer,
  CompactionDataContainer,
  PhaseDataContainer,
  ResponseCompactionItem,
  ResponseReasoningItem,
  ContextManagementConfig,
} from '../../types/copilot';

/**
 * Extract compaction data from message content parts
 */
export function extractCompactionData(
  content: ChatCompletionContentPart[]
): ResponseCompactionItem[] {
  const items: ResponseCompactionItem[] = [];

  for (const part of content) {
    if (part.type === ChatCompletionContentPartKind.Opaque) {
      const compaction = rawPartAsCompactionData(part);
      if (compaction) {
        items.push({
          type: 'compaction',
          id: compaction.id,
          encrypted_content: compaction.encrypted_content,
        });
      }
    }
  }

  return items;
}

/**
 * Extract stateful marker from messages
 * Returns the most recent marker matching the model ID
 */
export function extractStatefulMarker(
  modelId: string,
  messages: readonly ChatMessage[]
): { marker: string; index: number } | undefined {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    const message = messages[idx];
    if (message.role === 'assistant') {
      for (const part of message.content) {
        if (part.type === ChatCompletionContentPartKind.Opaque) {
          const statefulMarker = rawPartAsStatefulMarker(part);
          if (statefulMarker && statefulMarker.modelId === modelId) {
            return { marker: statefulMarker.marker, index: idx };
          }
        }
      }
    }
  }
  return undefined;
}

/**
 * Extract thinking/reasoning data from message content parts
 */
export function extractThinkingData(
  content: ChatCompletionContentPart[]
): ResponseReasoningItem[] {
  const items: ResponseReasoningItem[] = [];

  for (const part of content) {
    if (part.type === ChatCompletionContentPartKind.Opaque) {
      const thinkingData = rawPartAsThinkingData(part);
      if (thinkingData) {
        items.push({
          type: 'reasoning',
          id: thinkingData.id,
          summary: [],
          encrypted_content: thinkingData.encrypted,
        });
      }
    }
  }

  return items;
}

/**
 * Extract phase data from message content parts
 */
export function extractPhaseData(
  content: ChatCompletionContentPart[]
): string | undefined {
  for (const part of content) {
    if (part.type === ChatCompletionContentPartKind.Opaque) {
      const phase = rawPartAsPhaseData(part);
      if (phase) {
        return phase;
      }
    }
  }
  return undefined;
}

/**
 * Find the latest message with compaction data
 */
export function getLatestCompactionMessageIndex(
  messages: readonly ChatMessage[]
): number | undefined {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    const message = messages[idx];
    for (const part of message.content) {
      if (
        part.type === ChatCompletionContentPartKind.Opaque &&
        rawPartAsCompactionData(part)
      ) {
        return idx;
      }
    }
  }
  return undefined;
}

/**
 * Apply context management configuration
 * Creates compaction config based on model capabilities
 */
export function applyContextManagement(
  modelMaxPromptTokens: number,
  enabled: boolean = true
): ContextManagementConfig[] | undefined {
  if (!enabled || modelMaxPromptTokens <= 0) {
    return undefined;
  }

  // Trigger compaction at 90% of the model max prompt context
  const compactThreshold = Math.floor(modelMaxPromptTokens * 0.9);

  return [
    {
      type: 'compaction',
      compact_threshold: compactThreshold,
    },
  ];
}

/**
 * Parse opaque content part as compaction data
 */
function rawPartAsCompactionData(
  part: ChatCompletionContentPart
): ContextManagementResponse | undefined {
  if (part.type !== ChatCompletionContentPartKind.Opaque) {
    return undefined;
  }

  const value = part.value;
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const data = value as CompactionDataContainer;
  if (
    data.type === CustomDataPartMimeTypes.ContextManagement &&
    data.compaction &&
    typeof data.compaction === 'object'
  ) {
    return data.compaction;
  }

  return undefined;
}

/**
 * Parse opaque content part as stateful marker
 */
function rawPartAsStatefulMarker(
  part: ChatCompletionContentPart
): StatefulMarkerWithModel | undefined {
  if (part.type !== ChatCompletionContentPartKind.Opaque) {
    return undefined;
  }

  const value = part.value;
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const data = value as StatefulMarkerContainer;
  if (
    data.type === CustomDataPartMimeTypes.StatefulMarker &&
    typeof data.value === 'object'
  ) {
    return data.value;
  }

  return undefined;
}

/**
 * Parse opaque content part as thinking data
 */
function rawPartAsThinkingData(
  part: ChatCompletionContentPart
): ThinkingData | undefined {
  if (part.type !== ChatCompletionContentPartKind.Opaque) {
    return undefined;
  }

  const value = part.value;
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const data = value as ThinkingDataContainer;
  if (
    data.type === CustomDataPartMimeTypes.ThinkingData &&
    data.thinking &&
    typeof data.thinking === 'object'
  ) {
    return data.thinking;
  }

  return undefined;
}

/**
 * Parse opaque content part as phase data
 */
function rawPartAsPhaseData(
  part: ChatCompletionContentPart
): string | undefined {
  if (part.type !== ChatCompletionContentPartKind.Opaque) {
    return undefined;
  }

  const value = part.value;
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const data = value as PhaseDataContainer;
  if (
    data.type === CustomDataPartMimeTypes.PhaseData &&
    typeof data.phase === 'string'
  ) {
    return data.phase;
  }

  return undefined;
}

/**
 * Encode stateful marker for storage
 */
export function encodeStatefulMarker(
  modelId: string,
  marker: string
): Uint8Array {
  return new TextEncoder().encode(`${modelId}\\${marker}`);
}

/**
 * Decode stateful marker from storage
 */
export function decodeStatefulMarker(
  data: Uint8Array
): StatefulMarkerWithModel {
  const decoded = new TextDecoder().decode(data);
  const [modelId, marker] = decoded.split('\\');
  return { modelId, marker };
}
