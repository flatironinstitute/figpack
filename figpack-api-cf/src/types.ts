// Type definitions for the Figpack API

export interface Env {
	figpack_db: D1Database;
	BOOTSTRAP_KEY: string; // Add as a secret in Cloudflare
}

// User interface matching original API (camelCase)
export interface User {
	email: string;
	name: string;
	researchDescription: string;
	apiKey: string;
	isAdmin: boolean;
	createdAt: string;
	updatedAt?: string;
}

export interface AuthResult {
	isValid: boolean;
	isAdmin: boolean;
	user?: User;
	isBootstrap?: boolean;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetTime: number;
}

// Bucket interface
export interface Bucket {
	id?: number;
	name: string;
	provider: 'cloudflare' | 'aws';
	description: string;
	bucketBaseUrl: string;
	createdAt: number;
	updatedAt: number;
	// Credentials (flattened from nested object)
	awsAccessKeyId: string;
	awsSecretAccessKey: string;
	s3Endpoint: string;
	// Authorization (flattened from nested object)
	isPublic: boolean;
	authorizedUsers: string[]; // JSON string array in DB, parsed array in code
}

// Figure interface
export interface Figure {
	id?: number;
	figureUrl: string;
	bucket?: string;
	status: 'uploading' | 'completed' | 'failed';
	ownerEmail: string;
	uploadStarted: number;
	uploadUpdated: number;
	uploadCompleted?: number;
	expiration: number;
	figpackVersion: string;
	totalFiles?: number;
	totalSize?: number;
	uploadProgress?: string;
	createdAt: number;
	updatedAt: number;
	pinned: boolean;
	title?: string;
	// Flattened pinInfo structure
	pinName?: string;
	pinDescription?: string;
	pinnedTimestamp?: number;
	renewalTimestamp?: number;
	figureManagementUrl?: string;
	figpackManageUrl?: string;
	channel: 'default' | 'ephemeral';
	isEphemeral: boolean;
	sourceUrl?: string;
}

// FigpackDocument interface
export interface FigpackDocument {
	id?: number;
	documentId: string;
	ownerEmail: string;
	title: string;
	content: string;
	figureRefs: string[]; // JSON string array in DB, parsed array in code
	// Flattened accessControl
	viewMode: 'owner-only' | 'users' | 'public';
	editMode: 'owner-only' | 'users';
	viewerEmails: string[]; // JSON string array in DB, parsed array in code
	editorEmails: string[]; // JSON string array in DB, parsed array in code
	createdAt: number;
	updatedAt: number;
}

// Upload-related interfaces
export interface FileToUpload {
	relativePath: string;
	size: number;
}

export interface BatchUploadRequest {
	figureUrl: string;
	files: FileToUpload[];
	apiKey?: string; // version 0.3.0 compatibility
}

export interface SignedUrlInfo {
	relativePath: string;
	signedUrl: string;
}

export interface BatchUploadResponse {
	success: boolean;
	message: string;
	signedUrls?: SignedUrlInfo[];
}

// Usage stats interfaces
export interface UsageStats {
	userEmail: string;
	pinned: {
		totalFiles: number;
		totalSize: number;
		figureCount: number;
	};
	unpinned: {
		totalFiles: number;
		totalSize: number;
		figureCount: number;
	};
	total: {
		totalFiles: number;
		totalSize: number;
		figureCount: number;
	};
}

export interface UsageStatsResponse {
	success: boolean;
	message?: string;
	stats?: UsageStats;
}
