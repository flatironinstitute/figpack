# Figpack API Hardening Summary

This document summarizes the security and cost-control measures implemented to prevent abuse and protect against unexpected Cloudflare bills.

## Overview

The figpack-api-cf Cloudflare Worker has been hardened with multiple layers of protection to prevent resource abuse and control costs. All limits are configurable in `src/config.ts`.

## Implemented Protections

### 1. Request Size Validation

- **Limit**: 5MB maximum JSON payload size
- **Location**: `src/index.ts`
- **Benefit**: Prevents large request bodies from consuming worker CPU time and memory

### 2. D1-Based Rate Limiting

- **Implementation**: Replaced in-memory rate limiting with persistent D1 database tracking
- **Location**: `src/rateLimit.ts`, new migration `migrations/0002_rate_limits.sql`
- **Benefits**:
  - Rate limits persist across worker restarts
  - Shared across all Cloudflare edge locations
  - Configurable per endpoint type

**Rate Limit Windows**:

- General API endpoints: 60 requests/minute
- Upload endpoints: 20 requests/minute
- Figure creation: 30 requests/minute
- Admin operations: 120 requests/minute

### 3. Per-User Figure Count Limit

- **Limit**: 500 figures maximum per user (all figures counted, including expired)
- **Location**: `src/handlers/figuresHandler.ts` (handleCreateFigure)
- **Benefit**: Prevents single users from creating unlimited figures

### 4. Files Per Figure Limit

- **Limit**: 100 files maximum per figure
- **Location**: `src/handlers/uploadHandler.ts`
- **Benefit**: Prevents individual figures from consuming excessive storage

### 5. Global Ephemeral Figure Rate Limit

- **Limit**: 30 ephemeral figures per 5 minutes (global across all anonymous users)
- **Location**: `src/rateLimit.ts` (checkEphemeralFigureLimit), enforced in `src/handlers/figuresHandler.ts`
- **Benefit**: Prevents abuse of anonymous figure creation for free hosting

### 6. Batch Operation Limits

- **Upload Batch**: 100 files maximum per upload request
- **Bulk Renew**: 50 figures maximum per bulk renew operation
- **Location**: `src/config.ts`, enforced in handlers
- **Benefit**: Prevents resource-intensive batch operations

### 7. File Size Validation

- **Limit**: 1GB maximum per individual file (already existed, now documented)
- **Location**: `src/handlers/uploadHandler.ts`
- **Benefit**: Prevents excessively large files from filling R2 storage

## Configuration File

All limits are centralized in `src/config.ts`:

```typescript
export const API_LIMITS = {
  MAX_FILES_PER_FIGURE: 100,
  MAX_FIGURES_PER_USER: 500,
  MAX_FILE_SIZE_BYTES: 1GB,
  MAX_EPHEMERAL_FIGURES_PER_WINDOW: 30,
  EPHEMERAL_RATE_WINDOW_MS: 5 minutes,
  MAX_REQUEST_BODY_SIZE: 5MB,
  MAX_BATCH_UPLOAD_FILES: 100,
  MAX_BATCH_RENEW_FIGURES: 50,
  // Rate limit windows for different endpoint types
}
```

## Database Changes

### New Tables (Migration 0002)

**rate_limits table**:

- Tracks request counts per user/IP per endpoint type
- Indexed for fast lookups
- Old records automatically cleaned up after 24 hours

**ephemeral_figures_tracking table**:

- Tracks global ephemeral figure creation count
- Used to enforce the global 30 figures per 5 minutes limit

## Error Messages

All limit violations return clear error messages with:

- Current usage information
- Maximum allowed values
- Helpful guidance for users

Examples:

- `"Figure limit reached. Maximum 500 figures per user. You currently have 487 figures."`
- `"Too many files for a single figure. Maximum 100 files per figure. You provided 150 files."`
- `"Global ephemeral figure limit reached. Maximum 30 ephemeral figures per 5 minutes. Current count: 30. Please wait 3 minute(s) and try again."`

## What Was NOT Implemented (As Requested)

The following items were explicitly excluded from this implementation:

- ❌ Automated cleanup of expired figures (deferred for later)
- ❌ Bandwidth/egress monitoring
- ❌ Admin exemptions from limits
- ❌ Detailed usage tracking beyond rate limiting
- ❌ Advanced abuse detection patterns
- ❌ Cost alerts/notifications
- ❌ API key IP allowlisting

## Deployment Steps

To deploy these changes:

1. **Run the database migration**:

   ```bash
   cd figpack-api-cf
   npx wrangler d1 migrations apply figpack-db
   ```

2. **Deploy the worker**:

   ```bash
   npx wrangler deploy
   ```

3. **Monitor logs** for any issues:
   ```bash
   npx wrangler tail
   ```

## Testing Recommendations

Before deploying to production, test:

1. Rate limiting behavior under load
2. Ephemeral figure global limit with concurrent requests
3. Per-user figure count enforcement
4. Upload with >100 files (should be rejected)
5. Bulk renew with >50 figures needing renewal (should be rejected)

## Cost Impact

These measures should significantly reduce cost risks:

- **R2 Storage**: Limited by per-user figure counts and file limits
- **R2 Operations**: Controlled by rate limiting and batch operation limits
- **D1 Database**: Minimal additional cost (rate limit tracking uses small amount of storage)
- **Worker CPU**: Request size limits prevent expensive JSON parsing

## Future Enhancements

Consider adding later:

- Scheduled cleanup job for expired figures (via Cron Triggers)
- Per-user storage quotas (GB limits instead of just figure count)
- Monitoring dashboard for usage metrics
- Automatic notifications when limits are approached
