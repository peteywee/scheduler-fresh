#!/usr/bin/env bash
# Task: gitleaks-scan
# Description: Run Gitleaks against the working directory (no git history)
# Output: Timestamped report JSON in ./reports/

set -e

REPORT_DIR="reports"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="${REPORT_DIR}/gitleaks-${TIMESTAMP}.json"
IGNORE_FILE=".gitleaksignore"

mkdir -p "${REPORT_DIR}"

echo "🕵️‍♂️ Running Gitleaks security scan..."
echo "Output will be saved to ${REPORT_FILE}"

if ! command -v gitleaks &> /dev/null; then
  echo "❌ Gitleaks is not installed. Please install it first."
  exit 1
fi

gitleaks detect \
  --source . \
  --no-git \
  --verbose \
  --report-path "${REPORT_FILE}" \
  --config-path "${IGNORE_FILE}" || true

if grep -q '"Leaks": \[\]' "${REPORT_FILE}"; then
  echo "✅ No leaks detected."
else
  echo "⚠️  Leaks found! See ${REPORT_FILE}"
fi
