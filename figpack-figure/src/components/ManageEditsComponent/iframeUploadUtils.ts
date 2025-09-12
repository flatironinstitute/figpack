export interface UploadRequestPayload {
  figureUrl: string;
  files: { [path: string]: string | ArrayBuffer | null };
}

export interface UploadProgressPayload {
  progress: number;
  currentFile?: string;
  totalFiles: number;
  completedFiles: number;
}

export interface UploadSuccessPayload {
  message: string;
  uploadedFiles: string[];
}

export interface UploadErrorPayload {
  error: string;
  failedFile?: string;
}

// Messages from figpack-figure to figpack-manage
export type ParentToIframeMessage = {
  type: "UPLOAD_REQUEST";
  payload: UploadRequestPayload;
};

// Messages from figpack-manage to figpack-figure
export type IframeToParentMessage =
  | {
      type: "UPLOAD_PROGRESS";
      payload: UploadProgressPayload;
    }
  | {
      type: "UPLOAD_SUCCESS";
      payload: UploadSuccessPayload;
    }
  | {
      type: "UPLOAD_ERROR";
      payload: UploadErrorPayload;
    }
  | {
      type: "READY";
      payload: Record<string, never>;
    }
  | {
      type: "USER_CANCELLED";
      payload: Record<string, never>;
    };

export class ParentMessageHandler {
  private iframe: HTMLIFrameElement | null = null;
  private messageHandlers: Map<string, (payload: unknown) => void> = new Map();
  private readyPromise: Promise<void>;
  private readyResolve: (() => void) | null = null;

  constructor() {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
    this.setupMessageListener();
  }

  private setupMessageListener() {
    window.addEventListener("message", (event) => {
      try {
        const message = event.data as IframeToParentMessage;
        if (message && message.type && message.payload !== undefined) {
          // Handle ready message specially
          if (message.type === "READY" && this.readyResolve) {
            this.readyResolve();
            this.readyResolve = null;
            return;
          }

          const handler = this.messageHandlers.get(message.type);
          if (handler) {
            handler(message.payload);
          }
        }
      } catch (error) {
        console.error("Error processing message from iframe:", error);
      }
    });
  }

  public setIframe(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
  }

  public async waitForReady(): Promise<void> {
    return this.readyPromise;
  }

  public onMessage<T extends IframeToParentMessage["type"]>(
    type: T,
    handler: (
      payload: Extract<IframeToParentMessage, { type: T }>["payload"],
    ) => void,
  ) {
    this.messageHandlers.set(type, handler as (payload: unknown) => void);
  }

  public sendUploadRequest(
    figureUrl: string,
    files: { [path: string]: string | ArrayBuffer | null },
  ) {
    if (!this.iframe) {
      console.error("Cannot send message: iframe not set");
      return;
    }

    const message: ParentToIframeMessage = {
      type: "UPLOAD_REQUEST",
      payload: {
        figureUrl,
        files,
      },
    };

    try {
      this.iframe.contentWindow?.postMessage(message, "*");
    } catch (error) {
      console.error("Error sending message to iframe:", error);
    }
  }

  public cleanup() {
    this.messageHandlers.clear();
    this.iframe = null;
    // Note: We don't remove the event listener as it's needed for the lifetime of the component
  }
}

export const createParentMessageHandler = () => new ParentMessageHandler();

export function shouldUseIframeUpload(figureUrl: string): boolean {
  // Use iframe upload for cloud figures (not localhost)
  return figureUrl.startsWith("https://figures.figpack.org/");
}
