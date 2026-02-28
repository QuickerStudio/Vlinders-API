/**
 * Server-Sent Events (SSE) Parser
 *
 * Based on microsoft/vscode implementation
 * Implements HTML specification for SSE stream interpretation
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation
 */

/**
 * SSE event interface
 */
export interface ISSEEvent {
  /**
   * Event type (defaults to "message")
   */
  type: string;

  /**
   * Event data
   */
  data: string;

  /**
   * Last event ID (for reconnection)
   */
  id?: string;

  /**
   * Reconnection time in milliseconds
   */
  retry?: number;
}

/**
 * Event handler callback
 */
export type SSEEventHandler = (event: ISSEEvent) => void;

/**
 * Character codes for parsing
 */
const enum Chr {
  CR = 13, // '\r'
  LF = 10, // '\n'
  COLON = 58, // ':'
  SPACE = 32, // ' '
}

/**
 * SSE Parser with state machine for handling CR/LF boundaries
 */
export class SSEParser {
  private dataBuffer = '';
  private eventTypeBuffer = '';
  private currentEventId?: string;
  private lastEventIdBuffer?: string;
  private reconnectionTime?: number;
  private buffer: Uint8Array[] = [];
  private endedOnCR = false;
  private readonly onEventHandler: SSEEventHandler;
  private readonly decoder: TextDecoder;

  /**
   * Creates a new SSE parser
   * @param onEvent Callback invoked when an event is dispatched
   */
  constructor(onEvent: SSEEventHandler) {
    this.onEventHandler = onEvent;
    this.decoder = new TextDecoder('utf-8');
  }

  /**
   * Gets the last event ID received
   */
  public getLastEventId(): string | undefined {
    return this.lastEventIdBuffer;
  }

  /**
   * Gets the reconnection time in milliseconds
   */
  public getReconnectionTime(): number | undefined {
    return this.reconnectionTime;
  }

  /**
   * Feeds a chunk of SSE stream to the parser
   * @param chunk UTF-8 encoded data chunk
   */
  public feed(chunk: Uint8Array): void {
    if (chunk.length === 0) {
      return;
    }

    let offset = 0;

    // Handle CR/LF boundary split across chunks
    if (this.endedOnCR && chunk[0] === Chr.LF) {
      offset++;
    }
    this.endedOnCR = false;

    // Process complete lines
    while (offset < chunk.length) {
      const indexCR = chunk.indexOf(Chr.CR, offset);
      const indexLF = chunk.indexOf(Chr.LF, offset);
      const index = indexCR === -1 ? indexLF : (indexLF === -1 ? indexCR : Math.min(indexCR, indexLF));

      if (index === -1) {
        break;
      }

      // Decode buffered data plus current line
      let str = '';
      for (const buf of this.buffer) {
        str += this.decoder.decode(buf, { stream: true });
      }
      str += this.decoder.decode(chunk.subarray(offset, index));
      this.processLine(str);

      this.buffer.length = 0;
      offset = index + (chunk[index] === Chr.CR && chunk[index + 1] === Chr.LF ? 2 : 1);
    }

    // Buffer remaining incomplete line
    if (offset < chunk.length) {
      this.buffer.push(chunk.subarray(offset));
    } else {
      this.endedOnCR = chunk[chunk.length - 1] === Chr.CR;
    }
  }

  /**
   * Processes a single line from the SSE stream
   */
  private processLine(line: string): void {
    // Empty line dispatches event
    if (!line.length) {
      this.dispatchEvent();
      return;
    }

    // Comment line (starts with ':')
    if (line.startsWith(':')) {
      return;
    }

    // Parse field name and value
    let field: string;
    let value: string;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      // No colon - entire line is field name, value is empty
      field = line;
      value = '';
    } else {
      // Split at colon
      field = line.substring(0, colonIndex);
      value = line.substring(colonIndex + 1);

      // Remove leading space from value
      if (value.startsWith(' ')) {
        value = value.substring(1);
      }
    }

    this.processField(field, value);
  }

  /**
   * Processes a field with given name and value
   */
  private processField(field: string, value: string): void {
    switch (field) {
      case 'event':
        this.eventTypeBuffer = value;
        break;

      case 'data':
        // Append value to data buffer with newline
        this.dataBuffer += value;
        this.dataBuffer += '\n';
        break;

      case 'id':
        // Set last event ID if value doesn't contain NULL
        if (!value.includes('\0')) {
          this.currentEventId = this.lastEventIdBuffer = value;
        } else {
          this.currentEventId = undefined;
        }
        break;

      case 'retry':
        // Set reconnection time if value is all digits
        if (/^\d+$/.test(value)) {
          this.reconnectionTime = parseInt(value, 10);
        }
        break;

      // Ignore unknown fields
    }
  }

  /**
   * Dispatches event based on current buffer state
   */
  private dispatchEvent(): void {
    // Empty data buffer - reset and return
    if (this.dataBuffer === '') {
      this.dataBuffer = '';
      this.eventTypeBuffer = '';
      return;
    }

    // Remove trailing newline from data
    if (this.dataBuffer.endsWith('\n')) {
      this.dataBuffer = this.dataBuffer.substring(0, this.dataBuffer.length - 1);
    }

    // Create event
    const event: ISSEEvent = {
      type: this.eventTypeBuffer || 'message',
      data: this.dataBuffer,
    };

    // Add optional fields
    if (this.currentEventId !== undefined) {
      event.id = this.currentEventId;
    }

    if (this.reconnectionTime !== undefined) {
      event.retry = this.reconnectionTime;
    }

    // Dispatch event
    this.onEventHandler(event);

    // Reset buffers
    this.reset();
  }

  /**
   * Resets parser state (except lastEventIdBuffer for reconnection)
   */
  public reset(): void {
    this.dataBuffer = '';
    this.eventTypeBuffer = '';
    this.currentEventId = undefined;
    // lastEventIdBuffer is preserved for reconnection
  }
}
