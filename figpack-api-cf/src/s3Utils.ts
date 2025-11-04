import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface S3BucketConfig {
  uri: string; // e.g., r2://bucket-name or s3://bucket-name?region=us-east-1
  credentials: string; // JSON string with accessKeyId, secretAccessKey, endpoint
}

interface BucketCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

interface ParsedBucketUri {
  service: string;
  region: string;
  bucketName: string;
}

// Parse bucket URI to extract service, region, and bucket name
export function parseBucketUri(uri: string): ParsedBucketUri {
  let queryIndex = uri.indexOf("?");
  if (queryIndex < 0) queryIndex = uri.length;

  const baseUri = uri.slice(0, queryIndex);
  const queryString = uri.slice(queryIndex + 1);

  const query: Record<string, string> = {};
  if (queryString) {
    for (const part of queryString.split("&")) {
      const [key, value] = part.split("=");
      if (key && value) {
        query[key] = value;
      }
    }
  }

  const region = query["region"] || "";
  const servicePrefix = baseUri.split("/")[0]?.split(":")[0] || "";
  
  let service: string;
  if (servicePrefix === "wasabi") service = "wasabi";
  else if (servicePrefix === "gs") service = "google";
  else if (servicePrefix === "s3") service = "aws";
  else if (servicePrefix === "r2") service = "r2";
  else service = servicePrefix;

  const bucketName = baseUri.split("/")[2] || "";

  return { region, service, bucketName };
}

// Extract bucket name from URI
export function bucketNameFromUri(uri: string): string {
  if (!uri) return "";
  return uri.split("?")[0].split("/")[2] || "";
}

// Client cache to avoid recreating clients
class S3ClientCache {
  private cache: Map<string, { client: S3Client; timestamp: number }> = new Map();
  private readonly expirationMs = 1000 * 60 * 10; // 10 minutes

  private hashString(s: string): string {
    let hash = 0;
    if (s.length === 0) return hash.toString();
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  get(bucket: S3BucketConfig): S3Client | undefined {
    const key = `${bucket.uri}:${this.hashString(bucket.credentials)}`;
    const cached = this.cache.get(key);
    
    if (!cached) return undefined;
    
    if (Date.now() - cached.timestamp > this.expirationMs) {
      this.cache.delete(key);
      return undefined;
    }
    
    return cached.client;
  }

  set(bucket: S3BucketConfig, client: S3Client): void {
    const key = `${bucket.uri}:${this.hashString(bucket.credentials)}`;
    this.cache.set(key, { client, timestamp: Date.now() });
  }
}

const clientCache = new S3ClientCache();

// Create S3 client for the given bucket configuration
export function createS3Client(bucket: S3BucketConfig): S3Client {
  // Check cache first
  const cached = clientCache.get(bucket);
  if (cached) return cached;

  const { service, region } = parseBucketUri(bucket.uri);
  
  let credentials: BucketCredentials;
  try {
    credentials = JSON.parse(bucket.credentials || "{}");
  } catch (err) {
    throw new Error("Invalid credentials JSON");
  }

  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
    throw new Error("Missing accessKeyId or secretAccessKey in credentials");
  }

  let endpoint: string | undefined;
  let clientRegion = region || "us-east-1";

  if (service === "wasabi") {
    endpoint = `https://s3.${region || "us-east-1"}.wasabisys.com`;
  } else if (service === "r2") {
    if (!credentials.endpoint) {
      throw new Error("No endpoint in credentials for R2");
    }
    endpoint = credentials.endpoint;
    clientRegion = "auto";
  } else if (service === "google") {
    endpoint = "https://storage.googleapis.com";
  }
  // For AWS S3, no custom endpoint needed

  const client = new S3Client({
    region: clientRegion,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
    endpoint,
    forcePathStyle: true,
  });

  // Cache the client
  clientCache.set(bucket, client);

  return client;
}

// Generate a presigned upload URL for a file
export async function getSignedUploadUrl(
  bucket: S3BucketConfig,
  key: string
): Promise<string> {
  const client = createS3Client(bucket);
  const bucketName = bucketNameFromUri(bucket.uri);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  // Generate presigned URL valid for 1 hour
  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: 3600, // 1 hour
  });

  return signedUrl;
}

// Upload an object directly to S3
export async function putObject(
  bucket: S3BucketConfig,
  key: string,
  body: string,
  contentType: string = "application/octet-stream"
): Promise<void> {
  const client = createS3Client(bucket);
  const bucketName = bucketNameFromUri(bucket.uri);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);
}

// Delete a single object from S3
export async function deleteObject(
  bucket: S3BucketConfig,
  key: string
): Promise<void> {
  const client = createS3Client(bucket);
  const bucketName = bucketNameFromUri(bucket.uri);

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await client.send(command);
}

// Delete multiple objects from S3
export async function deleteObjects(
  bucket: S3BucketConfig,
  keys: string[]
): Promise<void> {
  if (keys.length === 0) return;

  const client = createS3Client(bucket);
  const bucketName = bucketNameFromUri(bucket.uri);

  // S3 allows max 1000 objects per delete operation
  const chunkSize = 1000;

  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    
    const command = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: chunk.map(key => ({ Key: key })),
        Quiet: true,
      },
    });

    await client.send(command);
  }
}

// List objects in S3 bucket with a given prefix
export async function listObjects(
  bucket: S3BucketConfig,
  prefix: string,
  options: { continuationToken?: string; maxObjects?: number } = {}
): Promise<{ objects: { Key: string; Size: number }[]; continuationToken?: string }> {
  const client = createS3Client(bucket);
  const bucketName = bucketNameFromUri(bucket.uri);

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
    ContinuationToken: options.continuationToken,
    MaxKeys: options.maxObjects,
  });

  const response = await client.send(command);

  const objects = (response.Contents || []).map(obj => ({
    Key: obj.Key || "",
    Size: obj.Size || 0,
  }));

  return {
    objects,
    continuationToken: response.IsTruncated ? response.NextContinuationToken : undefined,
  };
}
