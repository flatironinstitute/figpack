import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Client cache to avoid recreating clients
class S3ClientCache {
	private cache: Map<string, { client: S3Client; timestamp: number }> = new Map();
	private readonly expirationMs = 1000 * 60 * 10; // 10 minutes

	get(bucketInfo: BucketInfo): S3Client | undefined {
		const key = bucketInfoToString(bucketInfo);
		const cached = this.cache.get(key);

		if (!cached) return undefined;

		if (Date.now() - cached.timestamp > this.expirationMs) {
			this.cache.delete(key);
			return undefined;
		}

		return cached.client;
	}

	set(bucketInfo: BucketInfo, client: S3Client): void {
		const key = bucketInfoToString(bucketInfo);
		this.cache.set(key, { client, timestamp: Date.now() });
	}
}

const clientCache = new S3ClientCache();

// Create S3 client for the given bucket configuration
export function createS3Client(bucketInfo: BucketInfo): S3Client {
	// Check cache first
	const cached = clientCache.get(bucketInfo);
	if (cached) return cached;

	// const { service, region } = parseBucketUri(bucket.uri);

	// let credentials: BucketCredentials;
	// try {
	// 	credentials = JSON.parse(bucket.credentials || '{}');
	// } catch (err) {
	// 	throw new Error('Invalid credentials JSON');
	// }

	// if (!credentials.accessKeyId || !credentials.secretAccessKey) {
	// 	throw new Error('Missing accessKeyId or secretAccessKey in credentials');
	// }

	// let endpoint: string | undefined;
	// let clientRegion = region || 'us-east-1';

	const client = new S3Client({
		region: bucketInfo.region,
		credentials: {
			accessKeyId: bucketInfo.accessKeyId,
			secretAccessKey: bucketInfo.secretAccessKey,
		},
		endpoint: bucketInfo.endpoint,
		forcePathStyle: true,
	});

	// Cache the client
	clientCache.set(bucketInfo, client);

	return client;
}

// Generate a presigned upload URL for a file
export async function getSignedUploadUrl(bucketInfo: BucketInfo, key: string): Promise<string> {
	const client = createS3Client(bucketInfo);
	// Use native bucket name for S3 API calls, fall back to bucketName if not defined
	const bucketName = bucketInfo.nativeBucketName || bucketInfo.bucketName;

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

export type BucketInfo = {
	provider: string;
	bucketName: string;
	nativeBucketName: string; // Actual bucket name on Cloudflare/AWS
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
	region: string;
};

export const bucketInfoToString = (bucketInfo: BucketInfo): string => {
	return `${bucketInfo.provider}:${bucketInfo.bucketName}:${bucketInfo.nativeBucketName}:${bucketInfo.accessKeyId}:${bucketInfo.secretAccessKey}:${bucketInfo.endpoint}:${bucketInfo.region}`;
};

// Upload an object directly to S3
export async function putObject(
	bucketInfo: BucketInfo,
	key: string,
	body: string,
	contentType: string = 'application/octet-stream',
): Promise<void> {
	const client = createS3Client(bucketInfo);
	// Use native bucket name for S3 API calls, fall back to bucketName if not defined
	const bucketName = bucketInfo.nativeBucketName || bucketInfo.bucketName;

	const command = new PutObjectCommand({
		Bucket: bucketName,
		Key: key,
		Body: body,
		ContentType: contentType,
	});

	await client.send(command);
}

// Delete a single object from S3
export async function deleteObject(bucketInfo: BucketInfo, key: string): Promise<void> {
	const client = createS3Client(bucketInfo);
	// Use native bucket name for S3 API calls, fall back to bucketName if not defined
	const bucketName = bucketInfo.nativeBucketName || bucketInfo.bucketName;

	const command = new DeleteObjectCommand({
		Bucket: bucketName,
		Key: key,
	});

	await client.send(command);
}

// Delete multiple objects from S3
export async function deleteObjects(bucketInfo: BucketInfo, keys: string[]): Promise<void> {
	if (keys.length === 0) return;

	const client = createS3Client(bucketInfo);
	// Use native bucket name for S3 API calls, fall back to bucketName if not defined
	const bucketName = bucketInfo.nativeBucketName || bucketInfo.bucketName;

	// S3 allows max 1000 objects per delete operation
	const chunkSize = 1000;

	for (let i = 0; i < keys.length; i += chunkSize) {
		const chunk = keys.slice(i, i + chunkSize);

		const command = new DeleteObjectsCommand({
			Bucket: bucketName,
			Delete: {
				Objects: chunk.map((key) => ({ Key: key })),
				Quiet: true,
			},
		});

		await client.send(command);
	}
}

// List objects in S3 bucket with a given prefix
// NOTE: List objects doesn't work in cloudflare workers environment
export async function listObjects(
	bucketInfo: BucketInfo,
	prefix: string,
	options: { continuationToken?: string; maxObjects?: number } = {},
): Promise<{ objects: { Key: string; Size: number }[]; continuationToken?: string }> {
	const client = createS3Client(bucketInfo);
	// Use native bucket name for S3 API calls, fall back to bucketName if not defined
	const bucketName = bucketInfo.nativeBucketName || bucketInfo.bucketName;

	const command = new ListObjectsV2Command({
		Bucket: bucketName,
		Prefix: prefix,
		ContinuationToken: options.continuationToken,
		MaxKeys: options.maxObjects,
	});

	const response = await client.send(command);

	const objects = (response.Contents || []).map((obj) => ({
		Key: obj.Key || '',
		Size: obj.Size || 0,
	}));

	return {
		objects,
		continuationToken: response.IsTruncated ? response.NextContinuationToken : undefined,
	};
}
