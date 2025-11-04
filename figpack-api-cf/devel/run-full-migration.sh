#!/bin/bash

# Full MongoDB to D1 Migration Script
# This script runs the complete data migration in the correct order

set -e  # Exit on any error

echo "================================================"
echo "MongoDB to Cloudflare D1 Data Migration"
echo "================================================"
echo ""

# Step 0: Check if migrations have been run
echo "Checking if database schema exists..."
TABLES_CHECK=$(npx wrangler d1 execute figpack-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='users'" 2>&1)

if [[ ! $TABLES_CHECK == *"users"* ]]; then
  echo ""
  echo "❌ Error: Database tables not found!"
  echo ""
  echo "You need to run migrations first to create the database schema:"
  echo "  npx wrangler d1 migrations apply figpack-db --remote"
  echo ""
  echo "After running migrations, try this script again."
  exit 1
fi

echo "✓ Database schema exists"
echo ""

# Check if required files exist
if [ ! -f "users.json" ]; then
  echo "❌ Error: users.json not found"
  echo "Please run: ./export-mongodb-data.sh YOUR_MONGODB_URI"
  exit 1
fi

if [ ! -f "buckets.json" ]; then
  echo "❌ Error: buckets.json not found"
  echo "Please run: ./export-mongodb-data.sh YOUR_MONGODB_URI"
  exit 1
fi

if [ ! -f "figures.json" ]; then
  echo "❌ Error: figures.json not found"
  echo "Please run: ./export-mongodb-data.sh YOUR_MONGODB_URI"
  exit 1
fi

if [ ! -f "documents.json" ]; then
  echo "❌ Error: documents.json not found"
  echo "Please run: ./export-mongodb-data.sh YOUR_MONGODB_URI"
  exit 1
fi

echo "✓ All export files found"
echo ""

# Confirm before proceeding
read -p "This will import all data to D1. Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Migration cancelled"
  exit 0
fi

echo ""
echo "Starting migration..."
echo ""

# Step 1: Import users
echo "================================================"
echo "Step 1/4: Importing Users"
echo "================================================"
node import-users-to-d1.mjs
if [ $? -ne 0 ]; then
  echo "❌ User import failed. Stopping migration."
  exit 1
fi
echo ""

# Step 2: Import buckets
echo "================================================"
echo "Step 2/4: Importing Buckets"
echo "================================================"
node import-buckets-to-d1.mjs
if [ $? -ne 0 ]; then
  echo "❌ Bucket import failed. Stopping migration."
  exit 1
fi
echo ""

# Step 3: Import figures
echo "================================================"
echo "Step 3/4: Importing Figures"
echo "================================================"
node import-figures-to-d1.mjs
if [ $? -ne 0 ]; then
  echo "❌ Figure import failed. Stopping migration."
  exit 1
fi
echo ""

# Step 4: Import documents
echo "================================================"
echo "Step 4/4: Importing Documents"
echo "================================================"
node import-documents-to-d1.mjs
if [ $? -ne 0 ]; then
  echo "❌ Document import failed. Stopping migration."
  exit 1
fi
echo ""

echo "================================================"
echo "✓ Migration Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Run verification: node verify-migration.mjs"
echo "2. Test the API endpoints"
echo "3. Update MIGRATION_SUMMARY.md checklist"
echo ""
