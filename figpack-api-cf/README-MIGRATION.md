# Data Migration Scripts - Ready to Use

All migration scripts have been created and are ready to execute! 

## What's Been Created

✅ **Export Script**
- `export-mongodb-data.sh` - Exports all MongoDB collections to JSON files

✅ **Import Scripts** 
- `import-users-to-d1.mjs` - Imports users
- `import-buckets-to-d1.mjs` - Imports buckets  
- `import-figures-to-d1.mjs` - Imports figures
- `import-documents-to-d1.mjs` - Imports documents

✅ **Orchestration Scripts**
- `run-full-migration.sh` - Runs complete migration (recommended)
- `verify-migration.mjs` - Verifies data integrity after migration

✅ **Documentation**
- `MIGRATION_GUIDE.md` - Complete step-by-step guide with troubleshooting

## Quick Start: Run the Migration

### Step 0: Create Database Schema (REQUIRED - First Time Only)

Before importing data, you must create the database tables:

```bash
cd figpack-api-cf
npx wrangler d1 migrations apply figpack-db --remote
```

This runs the SQL migration file `migrations/0001_migrating-from-mongo.sql` to create the database schema (users, buckets, figures, figpack_documents tables).

**Note:** You only need to do this once. The migration script will check if tables exist and remind you if needed.

### Step 1: Export from MongoDB

```bash
cd figpack-api-cf
./export-mongodb-data.sh "YOUR_MONGODB_URI"
```

Replace `YOUR_MONGODB_URI` with your actual connection string like:
- `mongodb+srv://user:pass@cluster.mongodb.net/figpack`
- `mongodb://localhost:27017/figpack`

This creates: `users.json`, `buckets.json`, `figures.json`, `documents.json`

### Step 2: Run the Full Migration

```bash
./run-full-migration.sh
```

This will:
- Check all export files exist
- Ask for confirmation
- Import in correct order: Users → Buckets → Figures → Documents
- Stop on any errors

### Step 3: Verify the Migration

```bash
node verify-migration.mjs
```

This shows record counts and sample data to confirm everything migrated correctly.

## What Happens During Migration

The scripts automatically handle:
- ✅ Flattening nested MongoDB objects into D1 columns
- ✅ Converting boolean values to integers (0/1)
- ✅ Converting JavaScript arrays to JSON strings
- ✅ Escaping special characters in text fields
- ✅ Converting date objects to Unix timestamps
- ✅ Handling optional/null fields correctly

## Key Files Generated During Import

Temporary SQL files (auto-deleted after use):
- `import-batch.sql` (users)
- `import-buckets-batch.sql`
- `import-figures-batch.sql`
- `import-documents-batch.sql`

## If Something Goes Wrong

See `MIGRATION_GUIDE.md` for detailed troubleshooting.

Quick fix for re-running migration:
```bash
# Clear D1 tables first (in reverse order)
npx wrangler d1 execute figpack-db --remote --command="DELETE FROM figpack_documents"
npx wrangler d1 execute figpack-db --remote --command="DELETE FROM figures"
npx wrangler d1 execute figpack-db --remote --command="DELETE FROM buckets"
npx wrangler d1 execute figpack-db --remote --command="DELETE FROM users"

# Then re-run
./run-full-migration.sh
```

## Next Steps After Migration

1. Run verification: `node verify-migration.mjs`
2. Test API endpoints with migrated data
3. Check MIGRATION_SUMMARY.md and update checklist items:
   - [ ] Import existing users from MongoDB
   - [ ] Import existing buckets  
   - [ ] Import existing figures
   - [ ] Import existing documents
4. Keep MongoDB as backup for a while before decommissioning

## Manual Import (if needed)

If you prefer to run imports individually:

```bash
node import-users-to-d1.mjs
node import-buckets-to-d1.mjs
node import-figures-to-d1.mjs
node import-documents-to-d1.mjs
```

Remember: Order matters! Always import users first, then buckets, figures, and documents last.

## Need Help?

- Check `MIGRATION_GUIDE.md` for detailed instructions
- Review error messages in console output
- Inspect the temporary SQL files before they're deleted
- Query D1 directly to check data: `npx wrangler d1 execute figpack-db --remote --command="SELECT * FROM users LIMIT 1"`
