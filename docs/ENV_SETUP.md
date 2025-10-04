# Environment Setup Quick Reference

This guide provides step-by-step instructions to set up your local development environment with all required credentials and configurations.

## Prerequisites

- Node.js 20+
- pnpm 10.18.0
- gcloud CLI authenticated
- Firebase CLI authenticated
- Access to the Firebase project (jordan-9697 or your project ID)

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
pnpm install
cd functions && npm install && cd ..
```

### 2. Create .env.local from Template

```bash
cp .env.example .env.local
```

### 3. Get Firebase Web Configuration

**Option A: From Firebase Console**

1. Go to Firebase Console → Project Settings → General
2. Scroll to "Your apps" → Web app
3. Copy the config values

**Option B: Using Firebase CLI**

```bash
firebase apps:sdkconfig web
```

Update `.env.local`:

```bash
./scripts/env-utils.sh update .env.local NEXT_PUBLIC_FIREBASE_API_KEY "AIza..."
./scripts/env-utils.sh update .env.local NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN "your-project.firebaseapp.com"
./scripts/env-utils.sh update .env.local NEXT_PUBLIC_FIREBASE_PROJECT_ID "your-project-id"
./scripts/env-utils.sh update .env.local NEXT_PUBLIC_FIREBASE_APP_ID "1:123456789:web:abc123"
```

### 4. Create Service Account

**IMPORTANT:** Replace `YOUR_PROJECT_ID` with your actual Firebase project ID (e.g., `jordan-9697`)

```bash
# Set your project first
gcloud config set project YOUR_PROJECT_ID

# Create service account and generate key
./scripts/service-accounts.sh create YOUR_PROJECT_ID
```

This will:

- Create `scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com`
- Assign required IAM roles
- Generate and encode a service account key
- Automatically update `.env.local` with `FIREBASE_SERVICE_ACCOUNT_JSON`

**If the script fails:**

```bash
# Manual method
gcloud iam service-accounts create scheduler-fresh-firebase \
  --display-name="Scheduler Admin"

# Assign roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Generate key
gcloud iam service-accounts keys create service-account.json \
  --iam-account="scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com"

# Base64 encode and add to .env.local
base64 -w0 service-account.json > service-account.b64
./scripts/env-utils.sh update .env.local FIREBASE_SERVICE_ACCOUNT_JSON "$(cat service-account.b64)"

# Clean up key files (keep them secure!)
rm service-account.json service-account.b64
```

### 5. Get Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key for your project
3. Add to environment:

```bash
./scripts/env-utils.sh update .env.local GOOGLE_GENAI_API_KEY "AIza..."
```

### 6. Validate Configuration

```bash
./scripts/env-utils.sh validate .env.local
```

Expected output:

```
[INFO] Validating environment file: .env.local
[SUCCESS] All required environment variables are present
[INFO] Decoding service account JSON from environment...
[SUCCESS] Service account JSON is valid
```

### 7. Test Firebase Admin SDK

```bash
node -e "require('dotenv').config({path:'.env.local'}); import('./src/lib/firebase.server.ts').then(m => { m.adminInit(); console.log('✓ Firebase Admin SDK initialized successfully'); }).catch(e => { console.error('✗ Failed:', e.message); process.exit(1); })"
```

Expected output:

```
✓ Firebase Admin SDK initialized successfully
```

### 8. Start Development Servers

```bash
# Terminal 1: Start Firebase emulators
pnpm run dev:api

# Terminal 2: Start Next.js dev server
pnpm run dev:web

# OR run both together
pnpm run dev
```

Visit http://localhost:3000 to see the app running.

## Verification Checklist

- [ ] `pnpm install` completed successfully
- [ ] `.env.local` file exists with all required variables
- [ ] `./scripts/env-utils.sh validate .env.local` passes
- [ ] Firebase Admin SDK test passes (step 7)
- [ ] `pnpm run typecheck` passes with no errors
- [ ] `pnpm run lint` passes with no errors
- [ ] `pnpm run dev:api` starts emulators without errors
- [ ] `pnpm run dev:web` starts Next.js without credential errors
- [ ] Can access http://localhost:3000 in browser
- [ ] Firebase emulator UI accessible at http://localhost:4000

## Common Issues & Solutions

### Issue: "gcloud project property must be set"

**Solution:**

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud config list
```

### Issue: "FIREBASE_SERVICE_ACCOUNT_JSON is not set"

**Solution:**

1. Check if variable exists: `grep FIREBASE_SERVICE_ACCOUNT_JSON .env.local`
2. Ensure no extra space after `=`: should be `FIREBASE_SERVICE_ACCOUNT_JSON=...`
3. Re-run service account creation script
4. Verify the base64 string is not empty

### Issue: "Invalid FIREBASE_SERVICE_ACCOUNT_JSON format"

**Solution:**

```bash
# Test decoding
./scripts/env-utils.sh service-account .env.local | jq .

# If it fails, regenerate the key
./scripts/service-accounts.sh generate-key YOUR_PROJECT_ID scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### Issue: "Port already in use"

**Solution:**

```bash
# Check which ports are in use
pnpm run check:ports 3000 8080 9099 9199

# Kill processes on those ports
pnpm run stop

# Or manually kill specific ports
pnpm dlx kill-port 3000 8080 9099 9199
```

### Issue: TypeScript deprecation warning

**Fixed!** The `functions/tsconfig.json` has been updated to use `moduleResolution: "NodeNext"` and includes `ignoreDeprecations: "6.0"`.

### Issue: "Cannot find module '@/lib/firebase.server.ts'"

**Solution:**

```bash
# Check if file exists
ls -la src/lib/firebase.server.ts

# Rebuild TypeScript
pnpm run typecheck

# Check path aliases in tsconfig.json
cat tsconfig.json | grep -A 3 paths
```

## Advanced Configuration

### Using Secret Manager (Production)

```bash
# Upload .env.local to Secret Manager
./scripts/secrets-management.sh sync-to-secrets YOUR_PROJECT_ID .env.local

# Download from Secret Manager
./scripts/secrets-management.sh sync-from-secrets YOUR_PROJECT_ID .env.local

# List all secrets
gcloud secrets list --project=YOUR_PROJECT_ID
```

### Rotating Service Account Keys

```bash
# List current keys
gcloud iam service-accounts keys list \
  --iam-account=scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Generate new key
./scripts/service-accounts.sh rotate-key YOUR_PROJECT_ID scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### Minimal IAM Permissions

For tighter security, you can reduce the roles to:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebaseauth.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

## Environment Variables Reference

| Variable                           | Required | Description                  | Example                   |
| ---------------------------------- | -------- | ---------------------------- | ------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`     | Yes      | Firebase Web API key         | `AIzaSyD...`              |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes      | Firebase Auth domain         | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  | Yes      | Firebase Project ID          | `my-project-123`          |
| `NEXT_PUBLIC_FIREBASE_APP_ID`      | Yes      | Firebase App ID              | `1:123:web:abc`           |
| `FIREBASE_SERVICE_ACCOUNT_JSON`    | Yes      | Service account key (base64) | `eyJ0eXBlI...`            |
| `GOOGLE_GENAI_API_KEY`             | Optional | Google AI API key            | `AIzaSyG...`              |
| `NODE_ENV`                         | Auto     | Node environment             | `development`             |
| `NEXT_PUBLIC_APP_URL`              | Auto     | App URL for dev              | `http://localhost:3000`   |

## Next Steps

1. ✅ Environment configured
2. Read [IMPLEMENTATION.md](./IMPLEMENTATION.md) for architecture overview
3. Read [ACTIONABLE_ISSUES.md](./ACTIONABLE_ISSUES.md) for known issues and fixes
4. Run `pnpm run test:rules` to verify Firestore rules
5. Seed emulator data: `pnpm run seed:emulator`
6. Start building features!

## Getting Help

- Check [firebase-gcp-cli-setup.md](./firebase-gcp-cli-setup.md) for detailed CLI docs
- Review [QUICKSTART.md](./QUICKSTART.md) for commands reference
- Check existing GitHub issues for similar problems
- Run validation scripts with verbose output: `./scripts/env-utils.sh status`

---

**Last Updated:** 2025  
**For:** Scheduler Fresh PWA Development
