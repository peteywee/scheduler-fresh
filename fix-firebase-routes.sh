#!/bin/bash

# Find all API route files that use getFirestore at module level
files=(
  "src/app/api/invites/list/route.ts"
  "src/app/api/invites/[code]/revoke/route.ts"
  "src/app/api/orgs/public-profile/route.ts"
  "src/app/api/orgs/search/route.ts"
  "src/app/api/orgs/request-access/route.ts"
  "src/app/api/orgs/join/route.ts"
  "src/app/api/orgs/requests/approve/route.ts"
)

for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    echo "Fixing $file..."
    
    # Replace the import and db initialization
    sed -i 's/import { adminAuth } from "@\/lib\/firebase.server";/import { adminAuth, adminInit } from "@\/lib\/firebase.server";/g' "$file"
    sed -i 's/const db = getFirestore();/\/\/ Lazy initialize to avoid build-time errors\nfunction getDb() {\n  adminInit();\n  return getFirestore();\n}/g' "$file"
    
    # Replace all db. references with getDb().
    sed -i 's/db\./getDb()./g' "$file"
    
    echo "Fixed $file"
  fi
done

echo "All files fixed!"
