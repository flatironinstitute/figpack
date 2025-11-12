/**
 * Configuration constants for API limits and rate limiting
 * Adjust these values as needed to control resource usage and prevent abuse
 */

export const API_LIMITS = {
	// Figure limits
	MAX_FILES_PER_FIGURE: 100,
	MAX_FIGURES_PER_USER: 500,
	MAX_FILE_SIZE_BYTES: 1024 * 1024 * 1024, // 1GB per file

	// Ephemeral figure limits (global)
	MAX_EPHEMERAL_FIGURES_PER_WINDOW: 30,
	EPHEMERAL_RATE_WINDOW_MS: 5 * 60 * 1000, // 5 minutes

	// Request size limits
	MAX_REQUEST_BODY_SIZE: 5 * 1024 * 1024, // 5MB JSON payload
	MAX_BATCH_UPLOAD_FILES: 100, // Max files in a single batch upload request
	MAX_BATCH_RENEW_FIGURES: 50, // Max figures in bulk renew operation

	// Rate limiting windows (in milliseconds)
	RATE_LIMIT_WINDOWS: {
		// General API endpoints
		GENERAL: {
			WINDOW_MS: 60 * 1000, // 1 minute
			MAX_REQUESTS: 60,
		},
		// Upload endpoints (more restrictive)
		UPLOAD: {
			WINDOW_MS: 60 * 1000, // 1 minute
			MAX_REQUESTS: 20,
		},
		// Figure creation (more restrictive)
		CREATE_FIGURE: {
			WINDOW_MS: 60 * 1000, // 1 minute
			MAX_REQUESTS: 30,
		},
		// Admin operations
		ADMIN: {
			WINDOW_MS: 60 * 1000, // 1 minute
			MAX_REQUESTS: 120,
		},
	},

	// Rate limit cleanup
	RATE_LIMIT_CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
	RATE_LIMIT_RETENTION_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;
