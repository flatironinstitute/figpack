#!/bin/bash

# MongoDB Data Export Script
# This script exports all collections from MongoDB to JSON files
# Usage: ./export-mongodb-data.sh YOUR_MONGODB_URI

if [ -z "$1" ]; then
  echo "Error: MongoDB URI required"
  echo "Usage: ./export-mongodb-data.sh YOUR_MONGODB_URI"
  exit 1
fi

MONGODB_URI="$1"

echo "Exporting MongoDB collections..."
echo ""

# Export users (if not already done)
echo "1. Exporting users collection..."
mongoexport --uri="$MONGODB_URI" --collection=users --out=users.json
if [ $? -eq 0 ]; then
  echo "   ✓ Users exported to users.json"
else
  echo "   ✗ Failed to export users"
fi
echo ""

# Export buckets
echo "2. Exporting buckets collection..."
mongoexport --uri="$MONGODB_URI" --collection=buckets --out=buckets.json
if [ $? -eq 0 ]; then
  echo "   ✓ Buckets exported to buckets.json"
else
  echo "   ✗ Failed to export buckets"
fi
echo ""

# Export figures
echo "3. Exporting figures collection..."
mongoexport --uri="$MONGODB_URI" --collection=figures --out=figures.json
if [ $? -eq 0 ]; then
  echo "   ✓ Figures exported to figures.json"
else
  echo "   ✗ Failed to export figures"
fi
echo ""

# Export figpackdocuments
echo "4. Exporting figpackdocuments collection..."
mongoexport --uri="$MONGODB_URI" --collection=figpackdocuments --out=documents.json
if [ $? -eq 0 ]; then
  echo "   ✓ Documents exported to documents.json"
else
  echo "   ✗ Failed to export documents"
fi
echo ""

echo "Export complete! Files created:"
ls -lh users.json buckets.json figures.json documents.json 2>/dev/null
