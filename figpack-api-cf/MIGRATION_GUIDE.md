# MongoDB to D1 Data Migration Guide

This guide explains how to migrate your data from MongoDB to Cloudflare D1.

## Overview

The migration consists of three main phases:

1. **Export** - Export data from MongoDB
2. **Import** - Import data into D1
3. **Verify** - Verify data integrity

## Prerequisites

- Access to your MongoDB database
- MongoDB tools installed (`mongoexport`)
- Node.js installed
- Wrangler CLI configured with Cloudflare account
- D1 database schema already created (via migrations)

## Migration Scripts

### Export Scripts

- `export-mongodb-data.sh` - Exports all collections from MongoDB

### Import Scripts

- `import-users-to-d1.mjs` - Imports users
- `import-buckets-to-d1.mjs` - Imports S3 bucket configurations
- `import-figures-to-d1.mjs` - Imports figure metadata
- `import-documents-to-d1.mjs` - Imports documents

### Helper Scripts

- `run-full-migration.sh` - Runs complete migration in correct order
- `verify-migration.mjs` - Verifies data was migrated correctly

## Step-by-Step Migration Process

### Step 0: Create Database Schema (REQUIRED - First Time Only)

Before importing any data, you must create the database tables by running the migration:

```bash
cd figpack-api-cf
npx wrangler d1 migrations apply figpack-db --remote
```

This command:

- Executes the SQL file `migrations/0001_migrating-from-mongo.sql`
- Creates all necessary tables (users, buckets, figures, figpack_documents)
- Sets up indexes for optimal query performance
- Only needs to be run once

**Verify the migration succeeded:**

```bash
npx wrangler d1 execute figpack-db --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

You should see: `users`, `buckets`, `figures`, `figpack_documents`

**Note:** The migration script `run-full-migration.sh` will automatically check if tables exist and remind you if this step is missing.

### Step 1: Export Data from MongoDB

First, make the export script executable and run it:

```bash
cd figpack-api-cf
chmod +x export-mongodb-data.sh
./export-mongodb-data.sh "YOUR_MONGODB_URI"
```

Replace `YOUR_MONGODB_URI` with your actual MongoDB connection string, e.g.:

```
mongodb+srv://username:password@cluster.mongodb.net/figpack
```

This will create four JSON files:

- `users.json`
- `buckets.json`
- `figures.json`
- `documents.json`

### Step 2: Verify Export Files

Check that all files were created successfully:

```bash
ls -lh *.json
```

You should see the four JSON files with their sizes.

### Step 3: Run Database Migration

Make the migration script executable and run it:

```bash
chmod +x run-full-migration.sh
./run-full-migration.sh
```

This script will:

1. Check that all export files exist
2. Ask for confirmation
3. Import data in the correct order:
   - Users (needed for foreign keys)
   - Buckets
   - Figures (references users and buckets)
   - Documents (references figures)

The script will stop if any step fails.

### Step 4: Verify Migration

Run the verification script:

```bash
node verify-migration.mjs
```

This will:

- Count records in MongoDB exports vs D1
- Show sample records from each table
- Help you confirm data integrity

### Manual Verification (Optional)

You can also manually query D1 to verify specific data:

```bash
# Count records
npx wrangler d1 execute figpack-db --remote --command="SELECT COUNT(*) FROM users"
npx wrangler d1 execute figpack-db --remote --command="SELECT COUNT(*) FROM buckets"
npx wrangler d1 execute figpack-db --remote --command="SELECT COUNT(*) FROM figures"
npx wrangler d1 execute figpack-db --remote --command="SELECT COUNT(*) FROM figpack_documents"

# Check specific user
npx wrangler d1 execute figpack-db --remote --command="SELECT * FROM users WHERE email='your@email.com'"

# Check figure ownership
npx wrangler d1 execute figpack-db --remote --command="SELECT figure_url, owner_email, status FROM figures LIMIT 5"
```

## Schema Transformation Details

The migration automatically handles these MongoDB to D1 transformations:

### Buckets Collection

**MongoDB (nested)** → **D1 (flat)**

- `credentials.AWS_ACCESS_KEY_ID` → `aws_access_key_id`
- `credentials.AWS_SECRET_ACCESS_KEY` → `aws_secret_access_key`
- `credentials.S3_ENDPOINT` → `s3_endpoint`
- `authorization.isPublic` → `is_public` (boolean → integer)
- `authorization.authorizedUsers` → `authorized_users` (JSON string)

### Figures Collection

**MongoDB (nested)** → **D1 (flat)**

- `pinInfo.name` → `pin_name`
- `pinInfo.figureDescription` → `pin_description`
- `pinInfo.pinnedTimestamp` → `pinned_timestamp`
- `pinned` → `pinned` (boolean → integer)
- `isEphemeral` → `is_ephemeral` (boolean → integer)

### Documents Collection

**MongoDB (nested)** → **D1 (flat)**

- `accessControl.viewMode` → `view_mode`
- `accessControl.editMode` → `edit_mode`
- `accessControl.viewerEmails` → `viewer_emails` (JSON string)
- `accessControl.editorEmails` → `editor_emails` (JSON string)
- `figureRefs` → `figure_refs` (JSON string)

## Troubleshooting

### Export Issues

**Problem**: `mongoexport: command not found`
**Solution**: Install MongoDB Database Tools: https://www.mongodb.com/docs/database-tools/installation/installation/

**Problem**: Connection timeout
**Solution**: Check your MongoDB URI and network connectivity. Ensure your IP is whitelisted in MongoDB Atlas if using cloud.

### Import Issues

**Problem**: Import fails with "table already exists" or duplicate key errors
**Solution**: If you need to re-run the migration, first clear the D1 tables:

```bash
npx wrangler d1 execute figpack-db --remote --command="DELETE FROM figpack_documents"
npx wrangler d1 execute figpack-db --remote --command="DELETE FROM figures"
npx wrangler d1 execute figpack-db --remote --command="DELETE FROM buckets"
npx wrangler d1 execute figpack-db --remote --command="DELETE FROM users"
```

**Problem**: SQL syntax errors
**Solution**: Check for special characters in your data. The scripts escape single quotes, but if you have unusual characters, you may need to update the import scripts.

### Verification Issues

**Problem**: Record counts don't match
**Solution**:

1. Check for errors in the import logs
2. Verify the export files contain valid JSON
3. Look for records that may have failed validation (e.g., invalid email formats)

## Important Notes

1. **Order matters**: Always import in this order: Users → Buckets → Figures → Documents
2. **Backup first**: If you have existing data in D1, back it up before importing
3. **Test first**: Consider testing the migration on a development/staging database first
4. **Credentials**: Bucket credentials (secret keys) are migrated and should remain secure
5. **Timestamps**: All MongoDB timestamps are converted to milliseconds since epoch

## Post-Migration Steps

After successful migration:

1. ✅ Verify all record counts match
2. ✅ Test API endpoints with real data
3. ✅ Verify figure URLs are accessible
4. ✅ Check user authentication works
5. ✅ Test bucket permissions
6. ✅ Verify document access controls
7. Update MIGRATION_SUMMARY.md checklist
8. Consider keeping MongoDB as read-only backup for a period

## Support

If you encounter issues not covered here:

1. Check the error messages in the console output
2. Review the generated SQL files (they're temporarily created during import)
3. Manually inspect problematic records in MongoDB vs D1
4. Check Cloudflare D1 logs in the dashboard
