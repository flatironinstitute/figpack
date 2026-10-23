import { AwsClient } from 'aws4fetch';
import { BucketInfo } from './s3Utils';

// Server-side listing and copying of objects within one bucket.
// These use signed fetch requests rather than @aws-sdk/client-s3 because the SDK parses
// S3's XML responses with DOMParser, which the Workers runtime does not provide.

export type S3Object = { key: string; size: number };

export class S3Error extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}

function bucketEndpoint(bucketInfo: BucketInfo): string {
	const bucketName = bucketInfo.nativeBucketName || bucketInfo.bucketName;
	// Same rule as createS3Client: AWS uses the regional host, others the stored endpoint (path style)
	const host = bucketInfo.provider === 'aws' ? `https://s3.${bucketInfo.region}.amazonaws.com` : bucketInfo.endpoint.replace(/\/+$/, '');
	return `${host}/${bucketName}`;
}

function awsClient(bucketInfo: BucketInfo): AwsClient {
	return new AwsClient({
		accessKeyId: bucketInfo.accessKeyId,
		secretAccessKey: bucketInfo.secretAccessKey,
		sessionToken: bucketInfo.sessionToken,
		service: 's3',
		region: bucketInfo.region,
	});
}

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');

function decodeXml(s: string): string {
	return s
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&');
}

const xmlTag = (xml: string, tag: string) => {
	const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
	return m ? decodeXml(m[1]) : undefined;
};

// List all objects under a prefix (ListObjectsV2, following continuation tokens)
export async function listAllObjects(bucketInfo: BucketInfo, prefix: string): Promise<S3Object[]> {
	const client = awsClient(bucketInfo);
	const objects: S3Object[] = [];
	let continuationToken: string | undefined;
	do {
		const params = new URLSearchParams({ 'list-type': '2', prefix });
		if (continuationToken) params.set('continuation-token', continuationToken);
		const resp = await client.fetch(`${bucketEndpoint(bucketInfo)}?${params}`);
		const xml = await resp.text();
		if (!resp.ok) throw new S3Error(`Failed to list objects (${resp.status}): ${xmlTag(xml, 'Message') || xml.slice(0, 200)}`, resp.status);
		for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
			objects.push({ key: xmlTag(m[1], 'Key') || '', size: Number(xmlTag(m[1], 'Size') || 0) });
		}
		continuationToken = xmlTag(xml, 'IsTruncated') === 'true' ? xmlTag(xml, 'NextContinuationToken') : undefined;
	} while (continuationToken);
	return objects;
}

// Copy one object into bucketInfo's bucket, from the same bucket or another bucket the credentials can read
// (CopyObject keeps the content type and other metadata)
export async function copyObject(bucketInfo: BucketInfo, sourceNativeBucket: string, sourceKey: string, destKey: string): Promise<void> {
	const resp = await awsClient(bucketInfo).fetch(`${bucketEndpoint(bucketInfo)}/${encodeKey(destKey)}`, {
		method: 'PUT',
		headers: { 'x-amz-copy-source': `/${sourceNativeBucket}/${encodeKey(sourceKey)}` },
	});
	const body = await resp.text();
	// CopyObject can fail with status 200 and an <Error> body
	if (!resp.ok || body.includes('<Error>')) {
		throw new Error(`Failed to copy ${sourceKey} (${resp.status}): ${xmlTag(body, 'Message') || body.slice(0, 200)}`);
	}
}

// Read an object as text; undefined if it does not exist
export async function getObjectText(bucketInfo: BucketInfo, key: string): Promise<string | undefined> {
	const resp = await awsClient(bucketInfo).fetch(`${bucketEndpoint(bucketInfo)}/${encodeKey(key)}`);
	if (resp.status === 404) return undefined;
	if (!resp.ok) throw new Error(`Failed to read ${key} (${resp.status})`);
	return await resp.text();
}

// Run tasks with limited concurrency (Workers allow 6 simultaneous outgoing connections)
export async function runLimited<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
	let next = 0;
	const worker = async () => {
		while (next < items.length) await task(items[next++]);
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
