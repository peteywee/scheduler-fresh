# Firebase and GCP CLI Configuration Guide

This guide provides comprehensive instructions for configuring Firebase and Google Cloud Platform using CLI tools to manage environment variables, encode/decode secrets, and create service accounts.

## 📋 Overview

The Scheduler Fresh project includes a complete CLI-based configuration system for:

- **Firebase Configuration**: Project setup, app creation, and environment variable extraction
- **GCP Services**: API enablement, project configuration, and service management
- **Service Accounts**: Creation, role assignment, and key management
- **Secret Management**: Secure storage and retrieval using Google Secret Manager
- **Environment Management**: Encoding/decoding utilities and validation

## 🚀 Quick Start

### Prerequisites

1. **Google Cloud CLI** (already installed)
2. **Firebase CLI** (available via pnpm)
3. **Required tools**: `jq`, `base64` (for JSON processing and encoding)
4. **Permissions**: Admin access to your GCP project

### One-Command Setup

For a complete setup, run the master configuration script:

```bash
./scripts/setup-cli-config.sh full
```

This will:
- Configure GCP project and enable required APIs
- Set up Firebase project and extract configuration
- Create service accounts with proper roles
- Configure Secret Manager
- Generate environment files
- Validate the entire setup

## 📝 Detailed Setup Instructions

### 1. GCP Configuration

Configure your Google Cloud Platform project:

```bash
# Interactive setup with project selection
./scripts/setup-gcp.sh setup

# Or specify a project ID directly
./scripts/setup-gcp.sh setup my-project-id

# Check current configuration
./scripts/setup-gcp.sh config

# Enable APIs only
./scripts/setup-gcp.sh enable-apis my-project-id
```

**What it does:**
- Authenticates with Google Cloud
- Sets up default project configuration
- Enables required APIs (Firebase, Firestore, Secret Manager, AI Platform, etc.)
- Configures Application Default Credentials
- Validates IAM permissions

### 2. Firebase Configuration

Set up your Firebase project and extract configuration:

```bash
# Setup Firebase for a specific project
./scripts/setup-firebase.sh my-project-id

# Or run interactively to select from available projects
./scripts/setup-firebase.sh
```

**What it does:**
- Authenticates with Firebase
- Initializes Firebase configuration
- Creates web app if needed
- Extracts API keys and configuration
- Updates `.env.local` and `.env.example`
- Configures Firebase emulators

### 3. Service Account Management

Create and manage service accounts for Firebase and AI operations:

```bash
# Create both Firebase and AI service accounts
./scripts/service-accounts.sh create my-project-id

# List all service accounts
./scripts/service-accounts.sh list my-project-id

# Generate new key for a service account
./scripts/service-accounts.sh generate-key my-project-id sa-email@project.iam.gserviceaccount.com

# Rotate service account key
./scripts/service-accounts.sh rotate-key my-project-id sa-email@project.iam.gserviceaccount.com

# Validate service account setup
./scripts/service-accounts.sh validate my-project-id sa-email@project.iam.gserviceaccount.com
```

**Service Accounts Created:**
- **Firebase Service Account**: `scheduler-fresh-firebase@PROJECT_ID.iam.gserviceaccount.com`
  - Roles: Firebase Admin, Firestore Service Agent, Storage Admin
- **AI Service Account**: `scheduler-fresh-ai@PROJECT_ID.iam.gserviceaccount.com`
  - Roles: AI Platform User, ML Developer, Secret Manager Accessor

### 4. Secret Management

Manage secrets using Google Secret Manager:

```bash
# Create a new secret
./scripts/secrets-management.sh create my-project-id secret-name "secret-value"

# Get a secret value
./scripts/secrets-management.sh get my-project-id secret-name

# List all secrets
./scripts/secrets-management.sh list my-project-id

# Store Firebase service account in Secret Manager
./scripts/secrets-management.sh store-firebase-sa my-project-id "$(cat service-account.json)"

# Store API key
./scripts/secrets-management.sh store-api-key my-project-id google-ai "your-api-key"

# Sync environment file to Secret Manager
./scripts/secrets-management.sh sync-to-secrets my-project-id .env.local

# Sync secrets back to environment file
./scripts/secrets-management.sh sync-from-secrets my-project-id .env.local
```

### 5. Environment Management

Manage environment variables and encoding/decoding:

```bash
# Check environment status
./scripts/env-utils.sh status

# Validate environment file
./scripts/env-utils.sh validate .env.local

# Encode JSON file to base64
./scripts/env-utils.sh encode service-account.json

# Decode base64 to JSON file
./scripts/env-utils.sh decode "base64-string" decoded.json

# Show Firebase configuration
./scripts/env-utils.sh config .env.local

# Generate environment template
./scripts/env-utils.sh generate-template .env.example

# Copy template to create local environment
./scripts/env-utils.sh copy-template .env.example .env.local
```

## 🔧 Environment Variables

The setup process manages these environment variables:

### Firebase Web (Client) Configuration
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

### Firebase Admin (Server) Configuration
```bash
# Service account JSON (base64 encoded or raw JSON)
FIREBASE_SERVICE_ACCOUNT_JSON=your_service_account_json_or_base64
```

### AI Configuration
```bash
# Google AI API key for Genkit
GOOGLE_GENAI_API_KEY=your_google_ai_api_key_here
```

## 🔐 Security Best Practices

### Service Account Key Management

1. **Automatic Encoding**: Service account JSON is automatically base64-encoded for environment variables
2. **Secret Manager Integration**: Store sensitive data in Google Secret Manager instead of environment files
3. **Key Rotation**: Regularly rotate service account keys using the provided scripts
4. **Minimal Permissions**: Service accounts are created with minimal required permissions

### Secret Storage

1. **Use Secret Manager**: Store production secrets in Google Secret Manager
2. **Environment Separation**: Use different projects/secrets for development and production
3. **Access Control**: Limit secret access to specific service accounts
4. **Audit Logs**: Monitor secret access through GCP audit logs

## 🔍 Validation and Troubleshooting

### Validate Complete Setup

```bash
# Run full validation
./scripts/setup-cli-config.sh validate

# Check individual components
./scripts/env-utils.sh validate
./scripts/service-accounts.sh validate my-project-id sa-email@project.iam.gserviceaccount.com
./scripts/secrets-management.sh validate my-project-id secret-name
```

### Common Issues and Solutions

#### "Permission Denied" Errors
- Ensure you have the required IAM roles in your GCP project
- Run `gcloud auth login` to re-authenticate
- Check that the project ID is correct

#### "Secret Not Found" Errors
- Verify the secret exists: `./scripts/secrets-management.sh list PROJECT_ID`
- Check Secret Manager API is enabled
- Ensure service account has `secretmanager.secretAccessor` role

#### "Invalid JSON" Errors
- Validate JSON format: `echo "$json" | jq empty`
- Check for escaped characters or encoding issues
- Use the encoding utilities to properly format service account JSON

#### Firebase Emulator Issues
- Ensure `firebase.json` exists and is properly configured
- Check that required ports (8080, 9099, 9199) are available
- Run `pnpm run dev:api` to start emulators

### Debug Mode

Enable debug output by setting environment variable:
```bash
export DEBUG=1
./scripts/setup-cli-config.sh full
```

## 🔄 Daily Workflows

### Development Workflow

```bash
# Start development servers
pnpm run dev

# Check environment status
./scripts/env-utils.sh status

# Update environment variable
./scripts/env-utils.sh update .env.local VAR_NAME "new-value"
```

### Production Deployment

```bash
# Sync secrets to Secret Manager for production
./scripts/secrets-management.sh sync-to-secrets production-project-id .env.production

# Validate production setup
./scripts/setup-cli-config.sh validate
```

### Secret Rotation

```bash
# Rotate Firebase service account key
./scripts/service-accounts.sh rotate-key PROJECT_ID firebase-sa-email

# Update secret in Secret Manager
./scripts/secrets-management.sh update PROJECT_ID secret-name "new-value"

# Sync back to environment
./scripts/secrets-management.sh sync-from-secrets PROJECT_ID .env.local
```

## 📊 Configuration Status

Check your current configuration status:

```bash
# Show complete status
./scripts/setup-cli-config.sh status

# Interactive menu for management
./scripts/setup-cli-config.sh interactive
```

## 🎯 Integration with Development Workflow

The CLI configuration integrates seamlessly with your existing development workflow:

1. **Pre-commit Hooks**: Environment validation can be added to git hooks
2. **CI/CD Integration**: Scripts can be used in deployment pipelines
3. **Development Scripts**: Integrate with existing pnpm scripts
4. **Documentation**: All scripts provide help and usage information

## 📞 Support and Resources

- **Script Help**: Run any script without arguments to see usage information
- **GCP Documentation**: [Google Cloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference)
- **Firebase Documentation**: [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- **Secret Manager**: [Google Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)