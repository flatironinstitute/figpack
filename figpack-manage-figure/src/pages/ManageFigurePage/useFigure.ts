import { useState, useEffect } from 'react';
import type { Manifest } from './FileManifest';

export interface PinInfo {
  name: string;
  figure_description: string;
  pinned_timestamp: string;
}

export interface FigpackStatus {
  status: 'uploading' | 'completed' | 'failed';
  figureId: string;
  uploadStarted: number;
  uploadUpdated: number;
  expiration: number;
  figpackVersion: string;
  createdAt: number;
  updatedAt: number;
  uploadCompleted?: number;
  totalFiles?: number;
  totalSize?: number;
  hasWriteAccess?: boolean;
  pinned?: boolean;
  pin_info?: PinInfo;
}

interface UseFigureResult {
  figureId: string;
  figpackStatus: FigpackStatus | null;
  manifest: Manifest | null;
  loading: boolean;
  error: string | null;
  isExpired: () => boolean;
  getTimeUntilExpiration: () => string | null;
  formatBytes: (bytes: number) => string;
  formatDate: (timestamp: number) => string;
  loadFigureData: (url: string) => Promise<void>;
}

export const useFigure = (figureUrl: string): UseFigureResult => {
  const [figpackStatus, setFigpackStatus] = useState<FigpackStatus | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const isExpired = (): boolean => {
    if (!figpackStatus?.expiration) return false;
    return Date.now() > figpackStatus.expiration;
  };

  const getTimeUntilExpiration = (): string | null => {
    if (!figpackStatus?.expiration) return null;
    const now = Date.now();
    const timeDiff = figpackStatus.expiration - now;

    if (timeDiff <= 0) return null;

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? "s" : ""} ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return "less than 1m";
    }
  };

  const loadFigureData = async (url: string) => {
    try {
      setLoading(true);
      setError(null);

      // Extract figure ID from URL
      const matches = url.match(/\/figures\/default\/([^/]+)\//);
      if (!matches) {
        throw new Error('Invalid figure URL format');
      }
      const figureId = matches[1];

      // Get API key from local storage if available
      const apiKey = localStorage.getItem('figpack_api_key');

      // Fetch figure data from new API endpoint
      const apiUrl = new URL('/api/figures/get', 'https://figpack-api.vercel.app');
      apiUrl.searchParams.set('figureId', figureId);
      if (apiKey) {
        apiUrl.searchParams.set('apiKey', apiKey);
      }

      const response = await fetch(apiUrl.toString());
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load figure data');
      }

      const data = await response.json();
      if (!data.success || !data.figure) {
        throw new Error(data.message || 'Failed to load figure data');
      }

      setFigpackStatus(data.figure);

      // If we have access to the manifest, fetch it
      try {
        const baseUrl = url.replace(/\/[^/]*$/, "");
        const manifestResponse = await fetch(`${baseUrl}/manifest.json`);
        if (manifestResponse.ok) {
          const manifestData = await manifestResponse.json();
          setManifest(manifestData);
        }
      } catch (err) {
        console.warn("Could not load manifest.json:", err);
      }
    } catch (err) {
      setError(`Error loading figure data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (figureUrl) {
      loadFigureData(figureUrl);
    } else {
      setError("No figure URL provided");
      setLoading(false);
    }
  }, [figureUrl]);

  return {
    figureId: figpackStatus?.figureId || '',
    figpackStatus,
    manifest,
    loading,
    error,
    isExpired,
    getTimeUntilExpiration,
    formatBytes,
    formatDate,
    loadFigureData
  };
};

export default useFigure;
