import { FIGPACK_API_BASE_URL } from "../../config";

export interface GetBySourceUrlResponse {
  success: boolean;
  message: string;
  figure?: {
    figureUrl: string;
    status: string;
    title?: string;
    [key: string]: unknown;
  };
  figureUrl?: string;
}

export async function getFigureBySourceUrl(
  sourceUrl: string
): Promise<GetBySourceUrlResponse> {
  const response = await fetch(
    `${FIGPACK_API_BASE_URL}/figures/find-by-source-url?sourceUrl=${encodeURIComponent(
      sourceUrl
    )}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return {
        success: false,
        message: `No figure found with source URL: ${sourceUrl}`,
      };
    }
    throw new Error(`Failed to query figure: ${response.statusText}`);
  }

  return await response.json();
}
