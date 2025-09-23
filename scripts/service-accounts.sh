#!/usr/bin/env bash
# Service Account Management Script
# Creates, manages, and configures service accounts for Firebase and GCP

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

# Function to create Firebase service account
create_firebase_service_account() {
  local project_id="$1"
  local sa_name="${2:-scheduler-fresh-firebase}"
  local sa_email="$sa_name@$project_id.iam.gserviceaccount.com"
  
  log_info "Creating Firebase service account: $sa_name"
  
  # Check if service account already exists
  if gcloud iam service-accounts describe "$sa_email" --project="$project_id" >/dev/null 2>&1; then
    log_warn "Service account $sa_email already exists"
  else
    # Create service account
    gcloud iam service-accounts create "$sa_name" \
      --display-name="Scheduler Fresh Firebase Service Account" \
      --description="Service account for Firebase Admin SDK operations" \
      --project="$project_id"
    
    log_success "Created service account: $sa_email"
  fi
  
  # Assign required roles
  log_info "Assigning roles to service account..."
  
  local roles=(
    "roles/firebase.admin"
    "roles/firestore.serviceAgent"
    "roles/storage.admin"
    "roles/cloudtrace.agent"
  )
  
  for role in "${roles[@]}"; do
    log_info "Assigning role: $role"
    gcloud projects add-iam-policy-binding "$project_id" \
      --member="serviceAccount:$sa_email" \
      --role="$role" \
      --quiet
  done
  
  log_success "Service account configured with required roles"
  echo "$sa_email"
}

# Function to create GCP AI service account
create_ai_service_account() {
  local project_id="$1"
  local sa_name="${2:-scheduler-fresh-ai}"
  local sa_email="$sa_name@$project_id.iam.gserviceaccount.com"
  
  log_info "Creating AI service account: $sa_name"
  
  # Check if service account already exists
  if gcloud iam service-accounts describe "$sa_email" --project="$project_id" >/dev/null 2>&1; then
    log_warn "Service account $sa_email already exists"
  else
    # Create service account
    gcloud iam service-accounts create "$sa_name" \
      --display-name="Scheduler Fresh AI Service Account" \
      --description="Service account for AI and ML operations" \
      --project="$project_id"
    
    log_success "Created service account: $sa_email"
  fi
  
  # Assign required roles
  log_info "Assigning roles to service account..."
  
  local roles=(
    "roles/aiplatform.user"
    "roles/ml.developer"
    "roles/secretmanager.secretAccessor"
  )
  
  for role in "${roles[@]}"; do
    log_info "Assigning role: $role"
    gcloud projects add-iam-policy-binding "$project_id" \
      --member="serviceAccount:$sa_email" \
      --role="$role" \
      --quiet
  done
  
  log_success "AI service account configured with required roles"
  echo "$sa_email"
}

# Function to generate and download service account key
generate_service_account_key() {
  local project_id="$1"
  local sa_email="$2"
  local key_file="${3:-service-account-key.json}"
  
  log_info "Generating service account key for: $sa_email"
  
  # Create temporary directory for keys
  local temp_dir
  temp_dir=$(mktemp -d)
  local temp_key_file="$temp_dir/$key_file"
  
  # Generate key
  gcloud iam service-accounts keys create "$temp_key_file" \
    --iam-account="$sa_email" \
    --project="$project_id"
  
  if [[ -f "$temp_key_file" ]]; then
    log_success "Service account key generated: $temp_key_file"
    
    # Encode to base64 for environment variable
    local encoded_key
    encoded_key=$(base64 -w 0 < "$temp_key_file")
    
    log_info "Base64 encoded key (for FIREBASE_SERVICE_ACCOUNT_JSON):"
    echo "$encoded_key"
    
    # Update .env.local if it exists
    if [[ -f ".env.local" ]]; then
      log_info "Updating .env.local with service account key..."
      
      # Backup existing .env.local
      cp ".env.local" ".env.local.backup.$(date +%Y%m%d-%H%M%S)"
      
      # Update or add the service account key
      if grep -q "FIREBASE_SERVICE_ACCOUNT_JSON=" .env.local; then
        # Replace existing line
        if command -v gsed >/dev/null 2>&1; then
          gsed -i "s|^FIREBASE_SERVICE_ACCOUNT_JSON=.*|FIREBASE_SERVICE_ACCOUNT_JSON=$encoded_key|" .env.local
        else
          sed -i "s|^FIREBASE_SERVICE_ACCOUNT_JSON=.*|FIREBASE_SERVICE_ACCOUNT_JSON=$encoded_key|" .env.local
        fi
      else
        # Add new line
        echo "FIREBASE_SERVICE_ACCOUNT_JSON=$encoded_key" >> .env.local
      fi
      
      log_success "Updated .env.local with service account key"
    fi
    
    # Clean up temporary file
    rm -f "$temp_key_file"
    rmdir "$temp_dir"
    
  else
    log_error "Failed to generate service account key"
    return 1
  fi
}

# Function to list service accounts
list_service_accounts() {
  local project_id="$1"
  
  log_info "Listing service accounts for project: $project_id"
  gcloud iam service-accounts list --project="$project_id" --format="table(email,displayName,disabled)"
}

# Function to list service account keys
list_service_account_keys() {
  local project_id="$1"
  local sa_email="$2"
  
  log_info "Listing keys for service account: $sa_email"
  gcloud iam service-accounts keys list --iam-account="$sa_email" --project="$project_id" --format="table(name,keyType,validAfterTime,validBeforeTime)"
}

# Function to delete service account key
delete_service_account_key() {
  local project_id="$1"
  local sa_email="$2"
  local key_id="$3"
  
  log_warn "Deleting service account key: $key_id"
  read -p "Are you sure you want to delete this key? (y/N): " confirm
  
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    gcloud iam service-accounts keys delete "$key_id" \
      --iam-account="$sa_email" \
      --project="$project_id" \
      --quiet
    log_success "Deleted service account key: $key_id"
  else
    log_info "Key deletion cancelled"
  fi
}

# Function to rotate service account key
rotate_service_account_key() {
  local project_id="$1"
  local sa_email="$2"
  
  log_info "Rotating service account key for: $sa_email"
  
  # List current keys
  log_info "Current keys:"
  list_service_account_keys "$project_id" "$sa_email"
  
  # Generate new key
  generate_service_account_key "$project_id" "$sa_email"
  
  log_warn "New key generated. Please update your applications and then manually delete old keys."
  log_info "Use: $0 delete-key $project_id $sa_email KEY_ID"
}

# Function to validate service account setup
validate_service_account() {
  local project_id="$1"
  local sa_email="$2"
  
  log_info "Validating service account setup: $sa_email"
  
  # Check if service account exists
  if ! gcloud iam service-accounts describe "$sa_email" --project="$project_id" >/dev/null 2>&1; then
    log_error "Service account does not exist: $sa_email"
    return 1
  fi
  
  # Check IAM bindings
  log_info "Checking IAM policy bindings..."
  local policy
  policy=$(gcloud projects get-iam-policy "$project_id" --format=json)
  
  if echo "$policy" | grep -q "$sa_email"; then
    log_success "Service account has IAM policy bindings"
  else
    log_warn "Service account may not have required IAM policy bindings"
  fi
  
  # Check if keys exist
  local key_count
  key_count=$(gcloud iam service-accounts keys list --iam-account="$sa_email" --project="$project_id" --format="value(name)" | wc -l)
  
  if [[ "$key_count" -gt 0 ]]; then
    log_success "Service account has $key_count key(s)"
  else
    log_warn "Service account has no keys generated"
  fi
  
  log_success "Service account validation complete"
}

# Main function
main() {
  local command="${1:-create}"
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
    "create"|"setup")
      log_info "=== Service Account Setup ==="
      
      # Create Firebase service account
      local firebase_sa
      firebase_sa=$(create_firebase_service_account "$project_id")
      
      # Generate and configure key for Firebase service account
      generate_service_account_key "$project_id" "$firebase_sa"
      
      # Create AI service account
      local ai_sa
      ai_sa=$(create_ai_service_account "$project_id")
      
      log_success "=== Service Account setup complete! ==="
      log_info "Firebase Service Account: $firebase_sa"
      log_info "AI Service Account: $ai_sa"
      ;;
    "list")
      list_service_accounts "$project_id"
      ;;
    "list-keys")
      local sa_email="${3:-}"
      if [[ -z "$sa_email" ]]; then
        log_error "Service account email required"
        log_info "Usage: $0 list-keys PROJECT_ID SERVICE_ACCOUNT_EMAIL"
        exit 1
      fi
      list_service_account_keys "$project_id" "$sa_email"
      ;;
    "generate-key")
      local sa_email="${3:-}"
      if [[ -z "$sa_email" ]]; then
        log_error "Service account email required"
        log_info "Usage: $0 generate-key PROJECT_ID SERVICE_ACCOUNT_EMAIL"
        exit 1
      fi
      generate_service_account_key "$project_id" "$sa_email"
      ;;
    "delete-key")
      local sa_email="${3:-}"
      local key_id="${4:-}"
      if [[ -z "$sa_email" ]] || [[ -z "$key_id" ]]; then
        log_error "Service account email and key ID required"
        log_info "Usage: $0 delete-key PROJECT_ID SERVICE_ACCOUNT_EMAIL KEY_ID"
        exit 1
      fi
      delete_service_account_key "$project_id" "$sa_email" "$key_id"
      ;;
    "rotate-key")
      local sa_email="${3:-}"
      if [[ -z "$sa_email" ]]; then
        log_error "Service account email required"
        log_info "Usage: $0 rotate-key PROJECT_ID SERVICE_ACCOUNT_EMAIL"
        exit 1
      fi
      rotate_service_account_key "$project_id" "$sa_email"
      ;;
    "validate")
      local sa_email="${3:-}"
      if [[ -z "$sa_email" ]]; then
        log_error "Service account email required"
        log_info "Usage: $0 validate PROJECT_ID SERVICE_ACCOUNT_EMAIL"
        exit 1
      fi
      validate_service_account "$project_id" "$sa_email"
      ;;
    *)
      log_error "Unknown command: $command"
      log_info "Usage: $0 [create|list|list-keys|generate-key|delete-key|rotate-key|validate] PROJECT_ID [args...]"
      log_info "Commands:"
      log_info "  create PROJECT_ID                                    - Create Firebase and AI service accounts"
      log_info "  list PROJECT_ID                                      - List all service accounts"
      log_info "  list-keys PROJECT_ID SERVICE_ACCOUNT_EMAIL           - List keys for a service account"
      log_info "  generate-key PROJECT_ID SERVICE_ACCOUNT_EMAIL        - Generate new key for service account"
      log_info "  delete-key PROJECT_ID SERVICE_ACCOUNT_EMAIL KEY_ID   - Delete a specific key"
      log_info "  rotate-key PROJECT_ID SERVICE_ACCOUNT_EMAIL          - Rotate service account key"
      log_info "  validate PROJECT_ID SERVICE_ACCOUNT_EMAIL            - Validate service account setup"
      exit 1
      ;;
  esac
}

# Run main function with all arguments
main "$@"