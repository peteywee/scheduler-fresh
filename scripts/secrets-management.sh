#!/usr/bin/env bash
# Secrets Management Script
# Manages secrets using Google Secret Manager and local environment files

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Ensure we're in project root
cd "$(dirname "$0")/.."

# Source environment utilities
source "$(dirname "$0")/env-utils.sh" 2>/dev/null || true

# Function to create secret in Secret Manager
create_secret() {
  local project_id="$1"
  local secret_name="$2"
  local secret_value="$3"
  local description="${4:-Secret managed by Scheduler Fresh}"
  
  log_info "Creating secret: $secret_name"
  
  # Check if secret already exists
  if gcloud secrets describe "$secret_name" --project="$project_id" >/dev/null 2>&1; then
    log_warn "Secret $secret_name already exists. Use 'update-secret' to add a new version."
    return 1
  fi
  
  # Create the secret
  gcloud secrets create "$secret_name" \
    --replication-policy="automatic" \
    --labels="app=scheduler-fresh,managed-by=scripts" \
    --project="$project_id"
  
  log_success "Created secret: $secret_name"
  
  # Add the initial version
  echo "$secret_value" | gcloud secrets versions add "$secret_name" \
    --data-file=- \
    --project="$project_id"
  
  log_success "Added initial version to secret: $secret_name"
}

# Function to update secret with new version
update_secret() {
  local project_id="$1"
  local secret_name="$2"
  local secret_value="$3"
  
  log_info "Adding new version to secret: $secret_name"
  
  # Check if secret exists
  if ! gcloud secrets describe "$secret_name" --project="$project_id" >/dev/null 2>&1; then
    log_error "Secret $secret_name does not exist. Use 'create-secret' first."
    return 1
  fi
  
  # Add new version
  echo "$secret_value" | gcloud secrets versions add "$secret_name" \
    --data-file=- \
    --project="$project_id"
  
  log_success "Added new version to secret: $secret_name"
}

# Function to get secret value
get_secret() {
  local project_id="$1"
  local secret_name="$2"
  local version="${3:-latest}"
  
  log_info "Retrieving secret: $secret_name (version: $version)"
  
  gcloud secrets versions access "$version" \
    --secret="$secret_name" \
    --project="$project_id"
}

# Function to list secrets
list_secrets() {
  local project_id="$1"
  
  log_info "Listing secrets for project: $project_id"
  gcloud secrets list --project="$project_id" --format="table(name,created,labels)"
}

# Function to list secret versions
list_secret_versions() {
  local project_id="$1"
  local secret_name="$2"
  
  log_info "Listing versions for secret: $secret_name"
  gcloud secrets versions list "$secret_name" \
    --project="$project_id" \
    --format="table(name,state,created)"
}

# Function to delete secret
delete_secret() {
  local project_id="$1"
  local secret_name="$2"
  
  log_warn "Deleting secret: $secret_name"
  read -p "Are you sure you want to delete this secret? (y/N): " confirm
  
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    gcloud secrets delete "$secret_name" \
      --project="$project_id" \
      --quiet
    log_success "Deleted secret: $secret_name"
  else
    log_info "Secret deletion cancelled"
  fi
}

# Function to store Firebase service account in Secret Manager
store_firebase_service_account() {
  local project_id="$1"
  local service_account_json="$2"
  local secret_name="${3:-firebase-service-account}"
  
  log_info "Storing Firebase service account in Secret Manager: $secret_name"
  
  # Validate JSON
  if ! echo "$service_account_json" | jq empty 2>/dev/null; then
    log_error "Invalid JSON format for service account"
    return 1
  fi
  
  # Create or update secret
  if gcloud secrets describe "$secret_name" --project="$project_id" >/dev/null 2>&1; then
    update_secret "$project_id" "$secret_name" "$service_account_json"
  else
    create_secret "$project_id" "$secret_name" "$service_account_json" "Firebase service account JSON"
  fi
}

# Function to store API keys in Secret Manager
store_api_key() {
  local project_id="$1"
  local key_name="$2"
  local api_key="$3"
  local secret_name="${4:-api-key-$key_name}"
  
  log_info "Storing API key in Secret Manager: $secret_name"
  
  # Create or update secret
  if gcloud secrets describe "$secret_name" --project="$project_id" >/dev/null 2>&1; then
    update_secret "$project_id" "$secret_name" "$api_key"
  else
    create_secret "$project_id" "$secret_name" "$api_key" "API key for $key_name"
  fi
}

# Function to retrieve and decode Firebase service account
get_firebase_service_account() {
  local project_id="$1"
  local secret_name="${2:-firebase-service-account}"
  local format="${3:-json}"
  
  log_info "Retrieving Firebase service account from Secret Manager: $secret_name"
  
  local service_account_json
  service_account_json=$(get_secret "$project_id" "$secret_name")
  
  case "$format" in
    "json")
      echo "$service_account_json"
      ;;
    "base64")
      echo "$service_account_json" | base64 -w 0
      ;;
    "env")
      local encoded
      encoded=$(echo "$service_account_json" | base64 -w 0)
      echo "FIREBASE_SERVICE_ACCOUNT_JSON=$encoded"
      ;;
    *)
      log_error "Unknown format: $format. Use: json, base64, or env"
      return 1
      ;;
  esac
}

# Function to sync secrets from environment file to Secret Manager
sync_env_to_secrets() {
  local project_id="$1"
  local env_file="${2:-.env.local}"
  
  if [[ ! -f "$env_file" ]]; then
    log_error "Environment file not found: $env_file"
    return 1
  fi
  
  log_info "Syncing environment variables to Secret Manager..."
  
  # Define which environment variables to sync to secrets
  local secret_vars=(
    "FIREBASE_SERVICE_ACCOUNT_JSON:firebase-service-account"
    "GOOGLE_GENAI_API_KEY:google-genai-api-key"
  )
  
  for var_mapping in "${secret_vars[@]}"; do
    local env_var="${var_mapping%%:*}"
    local secret_name="${var_mapping##*:}"
    
    local value
    value=$(grep "^${env_var}=" "$env_file" | cut -d'=' -f2- | tr -d '"' 2>/dev/null || echo "")
    
    if [[ -n "$value" ]]; then
      log_info "Syncing $env_var to secret: $secret_name"
      
      # Special handling for Firebase service account (decode base64 if needed)
      if [[ "$env_var" == "FIREBASE_SERVICE_ACCOUNT_JSON" ]]; then
        # Try to decode if it's base64
        if echo "$value" | base64 -d 2>/dev/null | jq empty 2>/dev/null; then
          value=$(echo "$value" | base64 -d)
        fi
      fi
      
      # Create or update secret
      if gcloud secrets describe "$secret_name" --project="$project_id" >/dev/null 2>&1; then
        update_secret "$project_id" "$secret_name" "$value"
      else
        create_secret "$project_id" "$secret_name" "$value" "Synced from $env_var"
      fi
    else
      log_warn "Environment variable $env_var not found in $env_file"
    fi
  done
  
  log_success "Environment sync to Secret Manager complete"
}

# Function to sync secrets from Secret Manager to environment file
sync_secrets_to_env() {
  local project_id="$1"
  local env_file="${2:-.env.local}"
  
  log_info "Syncing secrets from Secret Manager to environment file..."
  
  # Define which secrets to sync to environment variables
  local secret_mappings=(
    "firebase-service-account:FIREBASE_SERVICE_ACCOUNT_JSON:base64"
    "google-genai-api-key:GOOGLE_GENAI_API_KEY:raw"
  )
  
  # Backup existing environment file
  if [[ -f "$env_file" ]]; then
    cp "$env_file" "${env_file}.backup.$(date +%Y%m%d-%H%M%S)"
    log_info "Backed up existing environment file"
  fi
  
  for mapping in "${secret_mappings[@]}"; do
    local secret_name="${mapping%%:*}"
    local env_var="${mapping#*:}"
    env_var="${env_var%%:*}"
    local format="${mapping##*:}"
    
    log_info "Syncing secret $secret_name to $env_var"
    
    if gcloud secrets describe "$secret_name" --project="$project_id" >/dev/null 2>&1; then
      local value
      value=$(get_secret "$project_id" "$secret_name")
      
      # Format the value based on specified format
      case "$format" in
        "base64")
          value=$(echo "$value" | base64 -w 0)
          ;;
        "raw")
          # Value is used as-is
          ;;
        *)
          log_warn "Unknown format: $format for secret $secret_name"
          continue
          ;;
      esac
      
      # Update environment file
      update_env_var "$env_file" "$env_var" "$value"
    else
      log_warn "Secret $secret_name not found in Secret Manager"
    fi
  done
  
  log_success "Secrets sync to environment file complete"
}

# Function to setup IAM permissions for service account to access secrets
setup_secret_access() {
  local project_id="$1"
  local service_account_email="$2"
  
  log_info "Setting up secret access for service account: $service_account_email"
  
  # Grant Secret Manager accessor role
  gcloud projects add-iam-policy-binding "$project_id" \
    --member="serviceAccount:$service_account_email" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
  
  log_success "Granted Secret Manager access to service account"
}

# Function to validate secret access
validate_secret_access() {
  local project_id="$1"
  local secret_name="$2"
  
  log_info "Validating access to secret: $secret_name"
  
  if get_secret "$project_id" "$secret_name" >/dev/null 2>&1; then
    log_success "Successfully accessed secret: $secret_name"
  else
    log_error "Failed to access secret: $secret_name"
    log_info "Check IAM permissions and secret existence"
    return 1
  fi
}

# Main function
main() {
  local command="${1:-list}"
  local project_id="${2:-}"
  
  # Get project ID from gcloud config if not provided
  if [[ -z "$project_id" ]]; then
    project_id=$(gcloud config get-value project 2>/dev/null || echo "")
    if [[ -z "$project_id" ]]; then
      log_error "No project ID provided and no default project set in gcloud config"
      log_info "Usage: $0 COMMAND PROJECT_ID [args...]"
      exit 1
    fi
  fi
  
  case "$command" in
    "create")
      local secret_name="${3:-}"
      local secret_value="${4:-}"
      if [[ -z "$secret_name" ]] || [[ -z "$secret_value" ]]; then
        log_error "Secret name and value required"
        log_info "Usage: $0 create PROJECT_ID SECRET_NAME SECRET_VALUE"
        exit 1
      fi
      create_secret "$project_id" "$secret_name" "$secret_value"
      ;;
    "update")
      local secret_name="${3:-}"
      local secret_value="${4:-}"
      if [[ -z "$secret_name" ]] || [[ -z "$secret_value" ]]; then
        log_error "Secret name and value required"
        log_info "Usage: $0 update PROJECT_ID SECRET_NAME SECRET_VALUE"
        exit 1
      fi
      update_secret "$project_id" "$secret_name" "$secret_value"
      ;;
    "get")
      local secret_name="${3:-}"
      local version="${4:-latest}"
      if [[ -z "$secret_name" ]]; then
        log_error "Secret name required"
        log_info "Usage: $0 get PROJECT_ID SECRET_NAME [VERSION]"
        exit 1
      fi
      get_secret "$project_id" "$secret_name" "$version"
      ;;
    "list")
      list_secrets "$project_id"
      ;;
    "list-versions")
      local secret_name="${3:-}"
      if [[ -z "$secret_name" ]]; then
        log_error "Secret name required"
        log_info "Usage: $0 list-versions PROJECT_ID SECRET_NAME"
        exit 1
      fi
      list_secret_versions "$project_id" "$secret_name"
      ;;
    "delete")
      local secret_name="${3:-}"
      if [[ -z "$secret_name" ]]; then
        log_error "Secret name required"
        log_info "Usage: $0 delete PROJECT_ID SECRET_NAME"
        exit 1
      fi
      delete_secret "$project_id" "$secret_name"
      ;;
    "store-firebase-sa")
      local sa_json="${3:-}"
      if [[ -z "$sa_json" ]]; then
        log_error "Service account JSON required"
        log_info "Usage: $0 store-firebase-sa PROJECT_ID SERVICE_ACCOUNT_JSON"
        exit 1
      fi
      store_firebase_service_account "$project_id" "$sa_json"
      ;;
    "store-api-key")
      local key_name="${3:-}"
      local api_key="${4:-}"
      if [[ -z "$key_name" ]] || [[ -z "$api_key" ]]; then
        log_error "Key name and API key required"
        log_info "Usage: $0 store-api-key PROJECT_ID KEY_NAME API_KEY"
        exit 1
      fi
      store_api_key "$project_id" "$key_name" "$api_key"
      ;;
    "get-firebase-sa")
      local format="${3:-json}"
      get_firebase_service_account "$project_id" "firebase-service-account" "$format"
      ;;
    "sync-to-secrets")
      local env_file="${3:-.env.local}"
      sync_env_to_secrets "$project_id" "$env_file"
      ;;
    "sync-from-secrets")
      local env_file="${3:-.env.local}"
      sync_secrets_to_env "$project_id" "$env_file"
      ;;
    "setup-access")
      local sa_email="${3:-}"
      if [[ -z "$sa_email" ]]; then
        log_error "Service account email required"
        log_info "Usage: $0 setup-access PROJECT_ID SERVICE_ACCOUNT_EMAIL"
        exit 1
      fi
      setup_secret_access "$project_id" "$sa_email"
      ;;
    "validate")
      local secret_name="${3:-}"
      if [[ -z "$secret_name" ]]; then
        log_error "Secret name required"
        log_info "Usage: $0 validate PROJECT_ID SECRET_NAME"
        exit 1
      fi
      validate_secret_access "$project_id" "$secret_name"
      ;;
    *)
      log_error "Unknown command: $command"
      log_info "Usage: $0 [COMMAND] PROJECT_ID [args...]"
      log_info "Commands:"
      log_info "  create PROJECT_ID SECRET_NAME SECRET_VALUE          - Create a new secret"
      log_info "  update PROJECT_ID SECRET_NAME SECRET_VALUE          - Add new version to existing secret"
      log_info "  get PROJECT_ID SECRET_NAME [VERSION]                - Get secret value"
      log_info "  list PROJECT_ID                                     - List all secrets"
      log_info "  list-versions PROJECT_ID SECRET_NAME                - List secret versions"
      log_info "  delete PROJECT_ID SECRET_NAME                       - Delete a secret"
      log_info "  store-firebase-sa PROJECT_ID SA_JSON                - Store Firebase service account"
      log_info "  store-api-key PROJECT_ID KEY_NAME API_KEY           - Store an API key"
      log_info "  get-firebase-sa PROJECT_ID [FORMAT]                 - Get Firebase service account (json|base64|env)"
      log_info "  sync-to-secrets PROJECT_ID [ENV_FILE]               - Sync environment file to secrets"
      log_info "  sync-from-secrets PROJECT_ID [ENV_FILE]             - Sync secrets to environment file"
      log_info "  setup-access PROJECT_ID SERVICE_ACCOUNT_EMAIL       - Setup secret access for service account"
      log_info "  validate PROJECT_ID SECRET_NAME                     - Validate secret access"
      exit 1
      ;;
  esac
}

# Run main function with all arguments
main "$@"