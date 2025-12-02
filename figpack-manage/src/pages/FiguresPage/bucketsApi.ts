import { FIGPACK_API_BASE_URL } from "../../config";

export interface BucketListItem {
  id: number;
  name: string;
  provider: "cloudflare" | "aws";
  description: string;
  bucketBaseUrl: string;
  createdAt: number;
  updatedAt: number;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  s3Endpoint: string;
  isPublic: boolean;
  authorizedUsers: string[];
  nativeBucketName?: string;
}

export interface BucketsListResponse {
  success: boolean;
  message?: string;
  buckets?: BucketListItem[];
}

export const getUserBuckets = async (
  apiKey: string,
): Promise<BucketsListResponse> => {
  if (!apiKey) {
    return { success: false, message: "No API key available" };
  }

  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/buckets/list`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        buckets: result.buckets || [],
      };
    } else {
      return {
        success: false,
        message: result.message || "Failed to get buckets",
      };
    }
  } catch (err) {
    return {
      success: false,
      message: `Error getting buckets: ${err}`,
    };
  }
};
