# Environment Setup Guide

This guide walks you through setting up your local development environment for the Scheduler PWA.

## Prerequisites

- Node.js ≥ 20.x
- pnpm 10.x (or enable with `corepack enable`)
- Firebase CLI ≥ 14.x
- Google Cloud CLI (gcloud) - for production setup
- A Firebase project with Firestore and Authentication enabled

## Quick Setup (Recommended)

If you already have a Firebase project and just need to configure your local environment:

```bash
# 1. Copy the example environment file
cp .env.example .env.local

# 2. Run the automated setup script
./scripts/setup-cli-config.sh full

# 3. Validate your setup
./scripts/env-utils.sh validate .env.local
```

## Manual Setup

### Step 1: Create .env.local

Start by copying the example:

```bash
cp .env.example .env.local
```

### Step 2: Get Firebase Web Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on the gear icon → Project Settings
4. Scroll down to "Your apps" section
5. Select or create a web app
6. Copy the configuration values

Update `.env.local` with these values:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Step 3: Create Service Account

The Firebase Admin SDK needs a service account to operate on the server side.

#### Option A: Using the automation script (Recommended)

```bash
# Set your GCP project ID
gcloud config set project YOUR_PROJECT_ID

# Create service account and generate key
./scripts/service-accounts.sh create YOUR_PROJECT_ID
```

This script will:

- Create a service account named `scheduler-fresh-firebase`
- Assign necessary roles (Firebase Admin, Firestore, Storage, Cloud Trace)
- Generate a JSON key file
- Encode it to base64
- Automatically update your `.env.local` file

#### Option B: Manual creation

If you prefer manual control:

```bash
# 1. Set project
gcloud config set project YOUR_PROJECT_ID

# 2. Create service account
gcloud iam service-accounts create scheduler-fresh-firebase \
  --display-name="Scheduler Fresh Firebase Service Account"

# 3. Grant roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firestore.serviceAgent"

# 4. Generate and download key
gcloud iam service-accounts keys create service-account.json \
  --iam-account="scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com"

# 5. Encode to base64 (keeps .env.local clean)
base64 -w 0 < service-account.json

# 6. Copy the output and add to .env.local:
# FIREBASE_SERVICE_ACCOUNT_JSON=<paste_base64_here>
```

Alternatively, you can use raw JSON (not recommended for production):

```bash
# Add the entire JSON content as a single line
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":...}'
```

### Step 4: Google GenAI API Key (Optional)

If you're using AI features (Genkit):

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key for your project
3. Add it to `.env.local`:

```bash
GOOGLE_GENAI_API_KEY=AIza...
```

### Step 5: Validate Your Configuration

Run the validation script to ensure everything is set up correctly:

```bash
./scripts/env-utils.sh validate .env.local
```

You should see:

```
[SUCCESS] All required environment variables are present
[SUCCESS] Service account JSON is valid
```

## Troubleshooting

### Error: "FIREBASE_SERVICE_ACCOUNT_JSON not found"

**Cause**: The environment variable is missing or empty.

**Solution**:

```bash
# Check if the variable exists in your .env.local
grep FIREBASE_SERVICE_ACCOUNT_JSON .env.local

# If missing, run the service account setup
./scripts/service-accounts.sh create YOUR_PROJECT_ID

# Or manually add the base64-encoded JSON
./scripts/env-utils.sh update .env.local FIREBASE_SERVICE_ACCOUNT_JSON "YOUR_BASE64_STRING"
```

### Error: "Service account configured with required roles" followed by "Not a valid service account identifier"

**Cause**: This was a bug in v1.0.0 where log messages were being captured in command substitution.

**Solution**: This has been fixed in the latest version. Update your scripts:

```bash
git pull origin main
```

The logging functions now properly redirect to stderr, preventing log noise in captured variables.

### Error: "Port X is busy"

**Cause**: Another process is using a required port (3000, 8080, 9099, or 9199).

**Solution**:

```bash
# Check which ports are occupied
pnpm run check:ports

# Kill all development ports
pnpm run kill:ports

# Or kill specific ports
pnpm dlx kill-port 3000 8080 9099 9199
```

### Error: "Invalid service account JSON format"

**Cause**: The service account JSON is malformed or not properly encoded.

**Solution**:

```bash
# Decode and verify the JSON
./scripts/env-utils.sh service-account .env.local

# If invalid, regenerate the key
./scripts/service-accounts.sh generate-key YOUR_PROJECT_ID \
  scheduler-fresh-firebase@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### Error: "Permission denied" when running scripts

**Cause**: Scripts don't have execute permissions.

**Solution**:

```bash
chmod +x scripts/*.sh
```

## Environment Variables Reference

### Required Variables

| Variable                           | Description                         | Example                   |
| ---------------------------------- | ----------------------------------- | ------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`     | Firebase Web API key                | `AIzaSy...`               |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain                | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  | Firebase project ID                 | `my-project-123`          |
| `NEXT_PUBLIC_FIREBASE_APP_ID`      | Firebase app ID                     | `1:123:web:abc`           |
| `FIREBASE_SERVICE_ACCOUNT_JSON`    | Base64-encoded service account JSON | `ewogIC...`               |

### Optional Variables

| Variable               | Description          | Default                 |
| ---------------------- | -------------------- | ----------------------- |
| `NODE_ENV`             | Environment mode     | `development`           |
| `GOOGLE_GENAI_API_KEY` | Google GenAI API key | -                       |
| `NEXT_PUBLIC_APP_URL`  | App base URL         | `http://localhost:3000` |

## Using Secret Manager (Production)

For production deployments, use Google Secret Manager instead of `.env` files:

```bash
# Upload secrets to Secret Manager
./scripts/secrets-management.sh sync-to-secrets YOUR_PROJECT_ID .env.local

# Download secrets from Secret Manager
./scripts/secrets-management.sh sync-from-secrets YOUR_PROJECT_ID .env.local
```

## Helper Scripts Reference

| Script                                                           | Purpose                                 |
| ---------------------------------------------------------------- | --------------------------------------- |
| `./scripts/service-accounts.sh create PROJECT_ID`                | Create service account and generate key |
| `./scripts/service-accounts.sh generate-key PROJECT_ID EMAIL`    | Generate new key for existing account   |
| `./scripts/service-accounts.sh list PROJECT_ID`                  | List all service accounts               |
| `./scripts/env-utils.sh validate FILE`                           | Validate environment file               |
| `./scripts/env-utils.sh update FILE VAR VALUE`                   | Update environment variable             |
| `./scripts/env-utils.sh status FILE`                             | Show environment status                 |
| `./scripts/secrets-management.sh sync-to-secrets PROJECT FILE`   | Upload to Secret Manager                |
| `./scripts/secrets-management.sh sync-from-secrets PROJECT FILE` | Download from Secret Manager            |

## Next Steps

Once your environment is configured:

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Start development servers**:

   ```bash
   # Start everything (web + emulators)
   pnpm run dev

   # Or start individually
   pnpm run dev:web    # Next.js only
   pnpm run dev:api    # Firebase emulators only
   ```

3. **Run tests**:

   ```bash
   pnpm run test:rules  # Firestore rules tests
   pnpm run typecheck   # TypeScript validation
   pnpm run lint        # Code quality
   ```

4. **Seed test data** (optional):
   ```bash
   # With emulators running
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
   pnpm ts-node scripts/seed/seed.emulator.ts
   ```

## Security Best Practices

1. **Never commit `.env.local`** - it contains secrets
2. **Use base64 encoding** for service account JSON in environment files
3. **Rotate service account keys** regularly (use `rotate-key` command)
4. **Use Secret Manager** for production deployments
5. **Set minimal IAM roles** - only grant necessary permissions
6. **Use separate service accounts** for development and production

## Additional Resources

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Project README](../README.md)
- [Architecture Documentation](./architecture.md)
