#!/usr/bin/env bash
# Bootstrap Google Cloud project: set project, enable core APIs
set -euo pipefail

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found. Install Cloud SDK: https://cloud.google.com/sdk/docs/install" >&2
  exit 1
fi

PROJECT_ID=${1:-}
BILLING_ACCOUNT=${2:-}
REGION=${REGION:-us-central1}

if [[ -z "$PROJECT_ID" ]]; then
  echo "Usage: $0 <PROJECT_ID> [BILLING_ACCOUNT]" >&2
  exit 1
fi

echo "==> Setting active project: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

if [[ -n "${BILLING_ACCOUNT}" ]]; then
  echo "==> Linking billing account"
  gcloud beta billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" || true
fi

echo "==> Enabling required APIs"
APIS=(
  cloudresourcemanager.googleapis.com
  iam.googleapis.com
  iamcredentials.googleapis.com
  serviceusage.googleapis.com
  secretmanager.googleapis.com
  firebase.googleapis.com
  firebaserules.googleapis.com
  firestore.googleapis.com
  storage-component.googleapis.com
)
for api in "${APIS[@]}"; do
  gcloud services enable "$api" --project "$PROJECT_ID" || true
done

echo "==> Verifying enabled services"
gcloud services list --enabled --project "$PROJECT_ID" | cat

echo "✅ GCP bootstrap complete."