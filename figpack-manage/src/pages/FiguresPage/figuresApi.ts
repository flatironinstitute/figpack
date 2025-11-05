import { FIGPACK_API_BASE_URL } from "../../config";

export interface FigureListItem {
  figureUrl: string;
  bucket?: string;
  status: "uploading" | "completed" | "failed";
  ownerEmail: string;
  uploadStarted: number;
  uploadCompleted?: number;
  expiration: number;
  figpackVersion: string;
  totalFiles?: number;
  totalSize?: number;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  title?: string;
  // Flattened pinInfo (migrated from nested structure)
  pinName?: string;
  pinDescription?: string;
  pinnedTimestamp?: number;
  renewalTimestamp?: number;
  figureManagementUrl?: string; // to phase out
  figpackManageUrl?: string; // new
}

export interface FigureListResponse {
  success: boolean;
  message?: string;
  figures?: FigureListItem[];
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

export interface FigureListParams {
  apiKey: string;
  all?: boolean;
  page?: number;
  limit?: number;
  status?: "uploading" | "completed" | "failed";
  search?: string;
  sortBy?:
    | "createdAt"
    | "updatedAt"
    | "expiration"
    | "figureUrl"
    | "status"
    | "title"
    | "ownerEmail";
  sortOrder?: "asc" | "desc";
}

export const getFigures = async (
  params: FigureListParams,
): Promise<FigureListResponse> => {
  const {
    apiKey,
    all = false,
    page = 1,
    limit = 50,
    status,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  try {
    // Build query parameters
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
    });

    if (all) {
      queryParams.append("all", "true");
    }

    if (status) {
      queryParams.append("status", status);
    }

    if (search && search.trim()) {
      queryParams.append("search", search.trim());
    }

    const response = await fetch(
      `${FIGPACK_API_BASE_URL}/figures/list?${queryParams}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
      },
    );

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        figures: result.figures || [],
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 50,
        hasMore: result.hasMore || false,
      };
    } else {
      return {
        success: false,
        message: result.message || "Failed to get figures",
      };
    }
  } catch (err) {
    return {
      success: false,
      message: `Error getting figures: ${err}`,
    };
  }
};
