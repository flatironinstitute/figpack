import { FIGPACK_API_BASE_URL } from "../../config";

export interface Bucket {
  id?: number;
  name: string;
  provider: "cloudflare" | "aws";
  description: string;
  bucketBaseUrl: string;
  createdAt: number;
  updatedAt: number;
  // Credential mode: "server" stores secrets in the DB; "client"
  // means the uploading client resolves credentials on the fly (e.g. boto3 SSO).
  // Derived from whether awsAccessKeyId is set; not stored in DB itself.
  credentialMode?: "server" | "client";
  // Flattened credentials. Optional when credentialMode is "client".
  // The API returns awsSecretAccessKey as the placeholder
  // string "***HIDDEN***"; sending it back unchanged means "do not modify".
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  // Optional STS session token. The API returns "***HIDDEN***" when one is set
  // and undefined when none is configured. To clear, send an empty string;
  // the placeholder echoed back means "leave unchanged".
  awsSessionToken?: string;
  s3Endpoint?: string;
  // AWS region (e.g. us-west-2). For Cloudflare R2 use 'auto' (or leave blank).
  region?: string;
  // Flattened authorization
  isPublic: boolean;
  authorizedUsers: string[];
  // Native bucket name (actual bucket name on Cloudflare/AWS, defaults to name if not specified)
  nativeBucketName?: string;
  // Email of the user who owns this bucket. Undefined for legacy/admin-managed buckets.
  ownerEmail?: string;
  // Per-bucket override for figure expiration (seconds). undefined = use system default
  // (24h), 0 = never expire, positive integer = seconds.
  defaultExpirationSeconds?: number | null;
}

export interface BucketApiResponse {
  success: boolean;
  message?: string;
  buckets?: Bucket[];
  bucket?: Bucket;
}

// Admin-only: all buckets. Users hitting this will get 401.
export async function getBuckets(apiKey: string): Promise<BucketApiResponse> {
  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/buckets`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    return await response.json();
  } catch (error) {
    console.error("Error fetching buckets:", error);
    return { success: false, message: `Error fetching buckets: ${error}` };
  }
}

// Any authenticated user: returns buckets the user can see (owned, public, authorized; admins see all).
export async function getUserBuckets(
  apiKey: string,
): Promise<BucketApiResponse> {
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
      return { success: true, buckets: result.buckets || [] };
    }
    return { success: false, message: result.message || "Failed to get buckets" };
  } catch (err) {
    return { success: false, message: `Error getting buckets: ${err}` };
  }
}

export async function createBucket(
  apiKey: string,
  bucketData: Omit<Bucket, "createdAt" | "updatedAt">,
): Promise<BucketApiResponse> {
  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/buckets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ bucket: bucketData }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error creating bucket:", error);
    return { success: false, message: `Error creating bucket: ${error}` };
  }
}

export async function updateBucket(
  apiKey: string,
  name: string,
  bucketData: Partial<Omit<Bucket, "name" | "createdAt" | "updatedAt">>,
): Promise<BucketApiResponse> {
  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/buckets`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ name, bucket: bucketData }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error updating bucket:", error);
    return { success: false, message: `Error updating bucket: ${error}` };
  }
}

export async function deleteBucket(
  apiKey: string,
  name: string,
): Promise<BucketApiResponse> {
  try {
    const response = await fetch(`${FIGPACK_API_BASE_URL}/buckets`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ name }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error deleting bucket:", error);
    return { success: false, message: `Error deleting bucket: ${error}` };
  }
}
