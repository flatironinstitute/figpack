import type { MessageFromParent, MessageToParent } from '../types/uploadTypes';

export class IframeMessageHandler {
  private parentOrigin: string | null = null;
  private messageHandlers: Map<string, (payload: unknown) => void> = new Map();

  constructor() {
    this.setupMessageListener();
    this.notifyReady();
  }

  private setupMessageListener() {
    window.addEventListener('message', (event) => {
      // Validate origin - only accept messages from figpack figure domains
      if (!this.isValidOrigin(event.origin)) {
        console.warn('Received message from invalid origin:', event.origin);
        return;
      }

      // Store the parent origin for sending responses
      if (!this.parentOrigin) {
        this.parentOrigin = event.origin;
      }

      try {
        const message = event.data as MessageFromParent;
        if (message && message.type && message.payload !== undefined) {
          const handler = this.messageHandlers.get(message.type);
          if (handler) {
            handler(message.payload);
          } else {
            console.warn('No handler registered for message type:', message.type);
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
  }

  private isValidOrigin(origin: string): boolean {
    // Allow localhost for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      return true;
    }
    
    // Allow figpack figure domains
    if (origin === 'https://figures.figpack.org') {
      return true;
    }

    // Allow any origin that ends with .figpack.org for subdomains
    if (origin.endsWith('.figpack.org')) {
      return true;
    }

    return false;
  }

  public onMessage<T extends MessageFromParent['type']>(
    type: T,
    handler: (payload: Extract<MessageFromParent, { type: T }>['payload']) => void
  ) {
    this.messageHandlers.set(type, (payload: unknown) => {
      handler(payload as Extract<MessageFromParent, { type: T }>['payload']);
    });
  }

  public sendMessage(message: MessageToParent) {
    // if (!this.parentOrigin) {
    //   console.error('Cannot send message: parent origin not established');
    //   return;
    // }

    try {
      // window.parent.postMessage(message, this.parentOrigin);
      window.parent.postMessage(message, '*');
    } catch (error) {
      console.error('Error sending message to parent:', error);
    }
  }

  public sendProgress(progress: number, currentFile?: string, totalFiles = 1, completedFiles = 0) {
    this.sendMessage({
      type: 'UPLOAD_PROGRESS',
      payload: {
        progress,
        currentFile,
        totalFiles,
        completedFiles,
      },
    });
  }

  public sendSuccess(message: string, uploadedFiles: string[]) {
    this.sendMessage({
      type: 'UPLOAD_SUCCESS',
      payload: {
        message,
        uploadedFiles,
      },
    });
  }

  public sendError(error: string, failedFile?: string) {
    this.sendMessage({
      type: 'UPLOAD_ERROR',
      payload: {
        error,
        failedFile,
      },
    });
  }

  public sendCancelled() {
    this.sendMessage({
      type: 'USER_CANCELLED',
      payload: {},
    });
  }

  private notifyReady() {
    // Send ready message after a short delay to ensure parent is listening
    setTimeout(() => {
      this.sendMessage({
        type: 'READY',
        payload: {},
      });
    }, 100);
  }

  public cleanup() {
    this.messageHandlers.clear();
    // Note: We don't remove the event listener as it's needed for the lifetime of the component
  }
}

export const createIframeMessageHandler = () => new IframeMessageHandler();
