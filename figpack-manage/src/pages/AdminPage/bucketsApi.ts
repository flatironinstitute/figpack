import { FIGPACK_API_BASE_URL } from "../../config";

export interface Bucket {
  name: string;
  provider: "cloudflare" | "aws";
  description: string;
  bucketBaseUrl: string;
  createdAt: number;
  updatedAt: number;
  credentials: {
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    S3_ENDPOINT: string;
  };
  authorization: {
    isPublic: boolean;
    authorizedUsers: string[];
  };
}

export interface BucketApiResponse {
  success: boolean;
  message?: string;
  buckets?: Bucket[];
  bucket?: Bucket;
}

export async function getBuckets(apiKey: string): Promise<BucketApiResponse> {
  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/buckets`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching buckets:", error);
    return {
      success: false,
      message: `Error fetching buckets: ${error}`,
    };
  }
}

export async function createBucket(
  apiKey: string,
  bucketData: Omit<Bucket, "createdAt" | "updatedAt">
): Promise<BucketApiResponse> {
  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/buckets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        bucket: bucketData,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating bucket:", error);
    return {
      success: false,
      message: `Error creating bucket: ${error}`,
    };
  }
}

export async function updateBucket(
  apiKey: string,
  name: string,
  bucketData: Partial<Omit<Bucket, "name" | "createdAt" | "updatedAt">>
): Promise<BucketApiResponse> {
  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/buckets`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        name,
        bucket: bucketData,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating bucket:", error);
    return {
      success: false,
      message: `Error updating bucket: ${error}`,
    };
  }
}

export async function deleteBucket(
  apiKey: string,
  name: string
): Promise<BucketApiResponse> {
  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/buckets`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        name,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error deleting bucket:", error);
    return {
      success: false,
      message: `Error deleting bucket: ${error}`,
    };
  }
}
