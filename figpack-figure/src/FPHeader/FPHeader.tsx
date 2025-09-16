/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useState } from "react";
import { FigureInfoResult } from "src/hooks/useFigureInfo";
import { ParentToIframeMessage } from "./uploadTypes";

type Props = {
  width: number;
  height: number;
  figureUrl: string;
  figureInfoResult?: FigureInfoResult;
  onPutFigureFilesInterface?: (x: PutFigureFilesInterface) => void;
  curating: boolean;
};

export type PutFigureFilesInterface = {
  putFigureFiles: (
    files: { url: string; headers: any; body: string | ArrayBuffer }[],
  ) => Promise<void>;
};

const queryParams = new URLSearchParams(window.location.search);
const manageDev = queryParams.get("manage_dev") === "1";

const FPHeader: FunctionComponent<Props> = ({
  width,
  height,
  figureUrl,
  figureInfoResult,
  onPutFigureFilesInterface,
  curating,
}) => {
  const [putFigureFilesInterface, setPutFigureFilesInterface] =
    useState<PutFigureFilesInterface | null>(null);

  useEffect(() => {
    if (onPutFigureFilesInterface && putFigureFilesInterface) {
      onPutFigureFilesInterface(putFigureFilesInterface);
    }
  }, [putFigureFilesInterface, onPutFigureFilesInterface]);

  let figpackManageUrl = figureInfoResult?.figureInfo
    ? figureInfoResult.figureInfo.figpackManageUrl ||
      "https://manage.figpack.org"
    : undefined;

  if (manageDev) {
    figpackManageUrl = "http://localhost:5174";
  }

  const figureIsLocal = figureUrl.startsWith("http://localhost:");

  const [iframeElement, setIframeElement] = useState<HTMLIFrameElement | null>(
    null,
  );

  useEffect(() => {
    if (figureIsLocal && curating) {
      setPutFigureFilesInterface(createLocalPutFigureFilesInterface());
    } else {
      setPutFigureFilesInterface(
        createRemotePutFigureFilesInterface(figureUrl, iframeElement),
      );
    }
  }, [figureIsLocal, curating, iframeElement, figureUrl]);

  if (curating) {
    if (figureIsLocal) {
      return (
        <div
          style={{
            position: "relative",
            width: width,
            height: height,
            backgroundColor: "#f0f0f0",
            borderBottom: "1px solid #ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 14, color: "#333" }}>
            Curating Local Figure
          </div>
        </div>
      );
    } else {
      return (
        <iframe
          src={
            figpackManageUrl +
            `/edit-figure-service?figure_url=${encodeURIComponent(figureUrl)}`
          }
          width={width}
          height={height}
          ref={setIframeElement}
          style={{ border: "none" }}
        ></iframe>
      );
    }
  } else {
    return <></>;
  }
};

const createLocalPutFigureFilesInterface = (): PutFigureFilesInterface => {
  return {
    putFigureFiles: figpackPutFigureFiles,
  };
};

const figpackPutFigureFiles = async (
  files: { url: string; headers: any; body: string | ArrayBuffer }[],
) => {
  for (const file of files) {
    const response = await fetch(file.url, {
      method: "PUT",
      headers: file.headers,
      body: file.body,
    });
    if (!response.ok) {
      throw new Error(
        `Failed to upload file to ${file.url} (status: ${response.status})`,
      );
    }
  }
};

const createRemotePutFigureFilesInterface = (
  figureUrl: string,
  iframeElement: HTMLIFrameElement | null,
): PutFigureFilesInterface => {
  return {
    putFigureFiles: async (files) => {
      if (!iframeElement) {
        throw new Error("No iframe element available for uploading files");
      }
      return new Promise((resolve, reject) => {
        const handleMessage = (event: MessageEvent) => {
          if (event.source !== iframeElement.contentWindow) {
            return;
          }
          if (event.data.type === "UPLOAD_SUCCESS") {
            resolve();
          } else if (event.data.type === "UPLOAD_ERROR") {
            reject(new Error(event.data.message));
          }
        };
        window.addEventListener("message", handleMessage);
        const files2: {
          [relativePath: string]: string | ArrayBuffer | null;
        } = {};
        const figureUrlWithoutIndexHtml = figureUrl.endsWith("/index.html")
          ? figureUrl.slice(0, -"/index.html".length)
          : figureUrl;
        const figureUrlWithoutTrailingSlash =
          figureUrlWithoutIndexHtml.endsWith("/")
            ? figureUrlWithoutIndexHtml.slice(0, -1)
            : figureUrlWithoutIndexHtml;
        for (const f of files) {
          if (!f.url.startsWith(figureUrlWithoutTrailingSlash)) {
            throw new Error(
              `File URL ${f.url} does not match figure URL ${figureUrlWithoutTrailingSlash}`,
            );
          }
          const relativePath = f.url.slice(
            figureUrlWithoutTrailingSlash.length + 1,
          );
          files2[relativePath] = f.body;
        }
        const msg: ParentToIframeMessage = {
          type: "UPLOAD_REQUEST",
          payload: {
            figureUrl,
            files: files2,
          },
        };
        iframeElement.contentWindow?.postMessage(msg, "*");
      });
    },
  };
};

// const uploadFigureAnnotations = async (
//   figureUrl: string,
//   annotations: SavedFigureAnnotations,
//   headerIframeElement: HTMLIFrameElement | null,
// ): Promise<void> => {
//   if (!headerIframeElement) {
//     throw new Error("No iframe element available for uploading annotations");
//   }

//   return new Promise((resolve, reject) => {
//     // Get the current figure URL
//     const queryParams = new URLSearchParams(window.location.search);
//     const figureUrl = queryParams.get("figure");

//     let currentFigureUrl: string;
//     if (figureUrl) {
//       // Development mode: use the provided figure URL
//       currentFigureUrl = figureUrl.endsWith("/index.html")
//         ? figureUrl
//         : figureUrl.endsWith("/")
//           ? figureUrl
//           : figureUrl + "/";
//     } else {
//       // Production mode: derive from current URL
//       const baseUrl = window.location.href.split("?")[0];
//       currentFigureUrl = baseUrl.endsWith("/index.html")
//         ? baseUrl
//         : baseUrl.endsWith("/")
//           ? baseUrl
//           : baseUrl + "/";
//     }

//     // Convert annotations to JSON file content
//     const annotationsJson = JSON.stringify(annotations, null, 2);
//     const files = { "annotations.json": annotationsJson };

//     // Set up message listener for responses
//     const handleMessage = (event: MessageEvent) => {
//       // Validate origin for security
//       if (!isValidOrigin(event.origin)) {
//         return;
//       }

//       const message = event.data;
//       if (!message || !message.type) {
//         return;
//       }

//       switch (message.type) {
//         case "UPLOAD_SUCCESS":
//           window.removeEventListener("message", handleMessage);
//           resolve();
//           break;
//         case "UPLOAD_ERROR":
//           window.removeEventListener("message", handleMessage);
//           reject(new Error(message.payload?.error || "Upload failed"));
//           break;
//         case "USER_CANCELLED":
//           window.removeEventListener("message", handleMessage);
//           reject(new Error("Upload cancelled by user"));
//           break;
//         // We can ignore UPLOAD_PROGRESS messages for now
//       }
//     };

//     // Add message listener
//     window.addEventListener("message", handleMessage);

//     // Send upload request to iframe
//     const uploadMessage = {
//       type: "UPLOAD_REQUEST",
//       payload: {
//         figureUrl: currentFigureUrl,
//         files: files,
//       },
//     };

//     try {
//       headerIframeElement.contentWindow?.postMessage(uploadMessage, "*");
//     } catch (error) {
//       window.removeEventListener("message", handleMessage);
//       reject(new Error(`Failed to send upload request: ${error}`));
//     }

//     // Set a timeout to prevent hanging forever
//     setTimeout(() => {
//       window.removeEventListener("message", handleMessage);
//       reject(new Error("Upload request timed out"));
//     }, 30000); // 30 second timeout
//   });
// };

// // Helper function to validate message origins for security
// const isValidOrigin = (origin: string): boolean => {
//   // Allow localhost for development
//   if (
//     origin.startsWith("http://localhost:") ||
//     origin.startsWith("https://localhost:")
//   ) {
//     return true;
//   }

//   // Allow figpack manage domains
//   if (origin === "https://manage.figpack.org") {
//     return true;
//   }

//   // Allow any origin that ends with .figpack.org for subdomains
//   if (origin.endsWith(".figpack.org")) {
//     return true;
//   }

//   return false;
// };

export default FPHeader;
