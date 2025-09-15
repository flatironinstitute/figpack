/* eslint-disable @typescript-eslint/no-explicit-any */
import { FIGPACK_API_BASE_URL } from "../../config";

interface UploadFile {
  relativePath: string;
  size: number;
}

interface BatchUploadRequest {
  figureUrl: string;
  files: UploadFile[];
  apiKey: string;
}

interface SignedUrlInfo {
  relativePath: string;
  signedUrl: string;
}

interface BatchUploadResponse {
  success: boolean;
  message?: string;
  signedUrls?: SignedUrlInfo[];
}

interface FinalizeRequest {
  figureUrl: string;
  apiKey: string;
}

interface FinalizeResponse {
  success: boolean;
  message?: string;
}

/**
 * Get batch signed upload URLs for multiple files
 */
export async function getBatchSignedUrls(
  apiKey: string,
  figureUrl: string,
  files: { [path: string]: string | ArrayBuffer | null }
): Promise<{ success: boolean; message?: string; signedUrls?: SignedUrlInfo[] }> {
  try {
    // Prepare files data for the batch request
    const filesData: UploadFile[] = [];
    
    for (const [relativePath, content] of Object.entries(files)) {
      if (content === null) continue; // Skip deleted files

      let buf;
      if (typeof content === "string") {
        buf = new TextEncoder().encode(content);
      } else if (content instanceof ArrayBuffer) {
        buf = content;
      } else if ("buffer" in content) {
        buf = (content as any).buffer;
      } else {
        throw new Error("Unsupported file content type");
      }
      
      const size = buf.byteLength || buf.length || 0;
      
      filesData.push({
        relativePath,
        size,
      });
    }

    const payload: BatchUploadRequest = {
      figureUrl,
      files: filesData,
      apiKey,
    };

    const response = await fetch(`${FIGPACK_API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: BatchUploadResponse = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: data.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: data.success,
      message: data.message,
      signedUrls: data.signedUrls,
    };
  } catch (error) {
    console.error('Error getting batch signed URLs:', error);
    return {
      success: false,
      message: `Network error: ${error}`,
    };
  }
}

/**
 * Upload file content to a signed URL
 */
export async function uploadFileToSignedUrl(
  signedUrl: string,
  content: string | ArrayBuffer,
  relativePath: string
): Promise<{ success: boolean; message?: string }> {
  try {
    let buf;
    if (typeof content === "string") {
      buf = new TextEncoder().encode(content);
    } else if (content instanceof ArrayBuffer) {
      buf = content;
    } else if ("buffer" in content) {
      buf = (content as any).buffer;
    } else {
      throw new Error("Unsupported file content type");
    }

    const body = buf;

    const contentType = _determineContentType(relativePath);

    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body,
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Upload failed with status: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error uploading file to signed URL:', error);
    return {
      success: false,
      message: `Upload error: ${error}`,
    };
  }
}

/**
 * Finalize the figure upload
 */
export async function finalizeFigureUpload(
  apiKey: string,
  figureUrl: string
): Promise<FinalizeResponse> {
  try {
    const payload: FinalizeRequest = {
      figureUrl,
      apiKey,
    };

    const response = await fetch(`${FIGPACK_API_BASE_URL}/api/figures/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: FinalizeResponse = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: data.message || `HTTP ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error('Error finalizing figure upload:', error);
    return {
      success: false,
      message: `Network error: ${error}`,
    };
  }
}

/**
 * Upload multiple files to a figure using the batch API
 */
export async function uploadFigureFiles(
  apiKey: string,
  figureUrl: string,
  files: { [path: string]: string | ArrayBuffer | null },
  onProgress?: (progress: number, currentFile?: string, totalFiles?: number, completedFiles?: number) => void
): Promise<{ success: boolean; message?: string; uploadedFiles?: string[] }> {
  const filePaths = Object.keys(files).filter(path => files[path] !== null);
  const totalFiles = filePaths.length;
  let completedFiles = 0;
  const uploadedFiles: string[] = [];

  try {
    if (totalFiles === 0) {
      return {
        success: true,
        message: 'No files to upload',
        uploadedFiles: [],
      };
    }

    onProgress?.(0, undefined, totalFiles, 0);

    // Get batch signed URLs
    const batchResponse = await getBatchSignedUrls(apiKey, figureUrl, files);
    if (!batchResponse.success || !batchResponse.signedUrls) {
      throw new Error(`Failed to get signed URLs: ${batchResponse.message}`);
    }

    // Create a map for quick lookup
    const signedUrlMap = new Map<string, string>();
    for (const urlInfo of batchResponse.signedUrls) {
      signedUrlMap.set(urlInfo.relativePath, urlInfo.signedUrl);
    }

    // Upload each file
    for (const filePath of filePaths) {
      const fileContent = files[filePath];
      if (fileContent === null) continue;

      const signedUrl = signedUrlMap.get(filePath);
      if (!signedUrl) {
        throw new Error(`No signed URL found for ${filePath}`);
      }

      onProgress?.(
        (completedFiles / totalFiles) * 100,
        filePath,
        totalFiles,
        completedFiles
      );

      // Upload the file
      const uploadResponse = await uploadFileToSignedUrl(signedUrl, fileContent, filePath);
      if (!uploadResponse.success) {
        throw new Error(`Failed to upload ${filePath}: ${uploadResponse.message}`);
      }

      uploadedFiles.push(filePath);
      completedFiles++;

      onProgress?.(
        (completedFiles / totalFiles) * 100,
        filePath,
        totalFiles,
        completedFiles
      );
    }

    // Finalize the upload
    const finalizeResponse = await finalizeFigureUpload(apiKey, figureUrl);
    if (!finalizeResponse.success) {
      throw new Error(`Failed to finalize upload: ${finalizeResponse.message}`);
    }

    return {
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      uploadedFiles,
    };
  } catch (error) {
    console.error('Error uploading figure files:', error);
    return {
      success: false,
      message: `Upload failed: ${error}`,
      uploadedFiles,
    };
  }
}

/**
 * Determine content type for upload based on file extension
 */
function _determineContentType(filePath: string): string {
  const fileName = filePath.split('/').pop() || '';
  const extension = fileName.includes('.') ? fileName.split('.').pop() : '';

  const contentTypeMap: { [key: string]: string } = {
    'json': 'application/json',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'png': 'image/png',
    'zattrs': 'application/json',
    'zgroup': 'application/json',
    'zarray': 'application/json',
    'zmetadata': 'application/json',
  };

  return contentTypeMap[extension || ''] || 'application/octet-stream';
}
