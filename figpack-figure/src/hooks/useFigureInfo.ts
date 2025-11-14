import { useState, useEffect } from "react";

export type FigureInfo = {
  status: string;
  uploadStarted?: string;
  uploadCompleted?: string;
  expiration?: string;
  figureUrl?: string;
  totalFiles?: number;
  figureManagementUrl?: string; // to phase out
  figpackManageUrl?: string; // new
  deleted?: boolean;
};

export type FigureInfoResult = {
  isLoading: boolean;
  error: string | null;
  figureInfo: FigureInfo | null;
  isExpired: boolean;
  expirationTime: Date | null;
  timeUntilExpiration: string | null;
  deleted: boolean;
};

const queryParams = new URLSearchParams(window.location.search);
const figureUrl = queryParams.get("figure");

const disableLoad = figureUrl?.startsWith("http://localhost:"); // for local figures we are not going to try to load figpack.json

export const useFigureInfo = (): FigureInfoResult => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [figureInfo, setFigureInfo] = useState<FigureInfo | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [expirationTime, setExpirationTime] = useState<Date | null>(null);
  const [timeUntilExpiration, setTimeUntilExpiration] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const loadFigureInfo = async () => {
      if (disableLoad) {
        setIsLoading(false);
        return;
      }
      try {
        let figpackJsonUrl = "./figpack.json";
        if (figureUrl) {
          const figureUrlWithoutTrailingIndexHtml = figureUrl.endsWith(
            "/index.html",
          )
            ? figureUrl.slice(0, -"/index.html".length)
            : figureUrl;
          const figureUrlWithoutTrailingSlash =
            figureUrlWithoutTrailingIndexHtml.endsWith("/")
              ? figureUrlWithoutTrailingIndexHtml.slice(0, -1)
              : figureUrlWithoutTrailingIndexHtml;
          figpackJsonUrl = figureUrlWithoutTrailingSlash + "/figpack.json";
        }
        const response = await fetch(figpackJsonUrl + `?cb=${Date.now()}`);
        if (!response.ok) {
          // File doesn't exist, no expiration
          setIsLoading(false);
          return;
        }

        const data: FigureInfo = await response.json();
        setFigureInfo(data);

        if (data.status === "completed" && data.expiration) {
          const et = new Date(data.expiration);
          setExpirationTime(et);

          const now = new Date();
          setIsExpired(now > et);
        }
      } catch (err) {
        setError(`Error loading figpack.json: ${err}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadFigureInfo();
  }, []);

  useEffect(() => {
    if (!expirationTime || isExpired) return;

    const now = new Date();
    const timeDiff = expirationTime.getTime() - now.getTime();

    if (timeDiff <= 0) {
      setIsExpired(true);
      setTimeUntilExpiration(null);
      return;
    }

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      setTimeUntilExpiration(`${hours}h ${minutes}m`);
    } else if (minutes > 0) {
      setTimeUntilExpiration(`${minutes}m`);
    } else {
      setTimeUntilExpiration(`less than 1m`);
    }
  }, [expirationTime, isExpired]);

  return {
    isLoading,
    error,
    figureInfo: figureInfo,
    isExpired,
    expirationTime,
    timeUntilExpiration,
    deleted: figureInfo?.deleted || false,
  };
};
