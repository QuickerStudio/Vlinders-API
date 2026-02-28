/**
 * Copilot Responses API types
 * Based on OpenAI Responses API with Copilot-specific extensions
 */

import { ChatCompletionRequest } from './chat';

/**
 * Responses API request extending standard chat completion request
 */
export interface ResponsesRequest extends Omit<ChatCompletionRequest, 'messages'> {
  /** Input items for the Responses API */
  input: ResponseInputItem[];
  /** Previous response ID for stateful continuation */
  previous_response_id?: string;
  /** Context management configuration */
  context_management?: ContextManagementConfig[];
  /** Reasoning configuration */
  reasoning?: ReasoningConfig;
  /** Truncation mode */
  truncation?: 'auto' | 'disabled';
  /** Include specific fields in response */
  include?: string[];
}

/**
 * Response input item types
 */
export type ResponseInputItem =
  | ResponseInputMessage
  | ResponseOutputMessage
  | ResponseFunctionCall
  | ResponseFunctionCallOutput
  | ResponseReasoningItem
  | ResponseCompactionItem;

/**
 * User or system message input
 */
export interface ResponseInputMessage {
  role: 'user' | 'system' | 'developer';
  content: ResponseInputContent[] | string;
}

/**
 * Assistant message output (for round-tripping)
 */
export interface ResponseOutputMessage {
  type: 'message';
  role: 'assistant';
  id: string;
  status: 'completed';
  content: ResponseOutputContent[];
  phase?: string;
}

/**
 * Function call input
 */
export interface ResponseFunctionCall {
  type: 'function_call';
  name: string;
  arguments: string;
  call_id: string;
}

/**
 * Function call output
 */
export interface ResponseFunctionCallOutput {
  type: 'function_call_output';
  call_id: string;
  output: string | ResponseFunctionOutputItem[];
}

/**
 * Reasoning/thinking item
 */
export interface ResponseReasoningItem {
  type: 'reasoning';
  id: string;
  summary: ResponseOutputText[];
  encrypted_content?: string;
}

/**
 * Compaction item for context management
 */
export interface ResponseCompactionItem {
  type: 'compaction';
  id: string;
  encrypted_content: string;
}

/**
 * Input content types
 */
export type ResponseInputContent =
  | ResponseInputText
  | ResponseInputImage
  | ResponseInputFile;

export interface ResponseInputText {
  type: 'input_text';
  text: string;
}

export interface ResponseInputImage {
  type: 'input_image';
  image_url: string;
  detail?: 'auto' | 'low' | 'high';
}

export interface ResponseInputFile {
  type: 'input_file';
  filename?: string;
  [key: string]: any;
}

/**
 * Output content types
 */
export type ResponseOutputContent = ResponseOutputText | ResponseOutputRefusal;

export interface ResponseOutputText {
  type: 'output_text';
  text: string;
  annotations?: any[];
}

export interface ResponseOutputRefusal {
  type: 'refusal';
  refusal: string;
}

/**
 * Function output item types
 */
export type ResponseFunctionOutputItem = ResponseInputContent;

/**
 * Context management configuration
 */
export interface ContextManagementConfig {
  type: 'compaction';
  compact_threshold: number;
}

/**
 * Context management response data
 */
export interface ContextManagementResponse {
  type: 'compaction';
  id: string;
  encrypted_content: string;
}

/**
 * Reasoning configuration
 */
export interface ReasoningConfig {
  effort?: 'low' | 'medium' | 'high';
  summary?: 'auto' | 'concise' | 'detailed';
}

/**
 * Thinking/reasoning data
 */
export interface ThinkingData {
  id: string;
  text: string | string[];
  metadata?: Record<string, any>;
  tokens?: number;
  encrypted?: string;
}

/**
 * Stateful marker with model ID
 */
export interface StatefulMarkerWithModel {
  modelId: string;
  marker: string;
}

/**
 * Custom data part MIME types
 */
export const CustomDataPartMimeTypes = {
  CacheControl: 'cache_control',
  StatefulMarker: 'stateful_marker',
  ThinkingData: 'thinking',
  ContextManagement: 'context_management',
  PhaseData: 'phase_data',
} as const;

/**
 * Opaque content part containers
 */
export interface StatefulMarkerContainer {
  type: typeof CustomDataPartMimeTypes.StatefulMarker;
  value: StatefulMarkerWithModel;
}

export interface ThinkingDataContainer {
  type: typeof CustomDataPartMimeTypes.ThinkingData;
  thinking: ThinkingData;
}

export interface CompactionDataContainer {
  type: typeof CustomDataPartMimeTypes.ContextManagement;
  compaction: ContextManagementResponse;
}

export interface PhaseDataContainer {
  type: typeof CustomDataPartMimeTypes.PhaseData;
  phase: string;
}
