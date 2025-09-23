#!/usr/bin/env bash
# GCP Configuration Setup Script
# Manages Google Cloud Platform configuration, authentication, and project setup

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

# Check if gcloud is available
check_gcloud_cli() {
  if ! command -v gcloud >/dev/null 2>&1; then
    log_error "Google Cloud CLI not found. Please install it first:"
    log_info "https://cloud.google.com/sdk/docs/install"
    return 1
  fi
  log_success "Google Cloud CLI available ($(gcloud version --format='value(Google Cloud SDK)'))"
}

# Function to authenticate with GCP
gcp_login() {
  log_info "Checking Google Cloud authentication status..."
  
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 >/dev/null 2>&1; then
    log_warn "Not authenticated with Google Cloud. Starting login process..."
    gcloud auth login
  else
    local active_account
    active_account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1)
    log_success "Already authenticated with Google Cloud as: $active_account"
  fi
}

# Function to list available GCP projects
list_gcp_projects() {
  log_info "Listing available Google Cloud projects..."
  gcloud projects list --format="table(projectId,name,projectNumber)"
}

# Function to create a new GCP project
create_gcp_project() {
  local project_id="$1"
  local project_name="${2:-$project_id}"
  
  log_info "Creating new GCP project: $project_id"
  
  # Check if project ID is available
  if gcloud projects describe "$project_id" >/dev/null 2>&1; then
    log_warn "Project $project_id already exists. Using existing project."
    return 0
  fi
  
  # Create the project
  if gcloud projects create "$project_id" --name="$project_name"; then
    log_success "Project $project_id created successfully!"
    
    # Set billing account if available (optional - will warn if not set)
    local billing_accounts
    billing_accounts=$(gcloud billing accounts list --format="value(name)" | head -n 1)
    if [[ -n "$billing_accounts" ]]; then
      log_info "Setting up billing for project $project_id..."
      if gcloud billing projects link "$project_id" --billing-account="$billing_accounts"; then
        log_success "Billing enabled for project $project_id"
      else
        log_warn "Failed to enable billing. You may need to enable it manually in the GCP Console."
      fi
    else
      log_warn "No billing account found. Please enable billing manually in the GCP Console."
      log_info "Visit: https://console.cloud.google.com/billing/linkedaccount?project=$project_id"
    fi
    
    return 0
  else
    log_error "Failed to create project $project_id"
    return 1
  fi
}

# Function to setup GCP project
setup_gcp_project() {
  local project_id="${1:-}"
  local create_new="${2:-false}"
  
  if [[ -z "$project_id" ]]; then
    log_info "Please provide a project ID or select from the list above:"
    read -p "Enter GCP Project ID: " project_id
  fi
  
  if [[ -z "$project_id" ]]; then
    log_error "Project ID is required"
    return 1
  fi
  
  log_info "Setting up GCP project: $project_id"
  
  # Check if we need to create the project
  if [[ "$create_new" == "true" ]] || ! gcloud projects describe "$project_id" >/dev/null 2>&1; then
    if [[ "$create_new" == "true" ]]; then
      log_info "Creating new project as requested..."
      create_gcp_project "$project_id" || return 1
    else
      log_warn "Project $project_id does not exist or is not accessible."
      read -p "Would you like to create this project? (y/N): " create_confirm
      if [[ "$create_confirm" =~ ^[Yy]$ ]]; then
        create_gcp_project "$project_id" || return 1
      else
        log_error "Cannot proceed without access to project $project_id"
        return 1
      fi
    fi
  fi
  
  # Set the project as default
  gcloud config set project "$project_id"
  
  # Verify project access
  if ! gcloud projects describe "$project_id" >/dev/null 2>&1; then
    log_error "Cannot access project $project_id after setup. Check permissions."
    return 1
  fi
  
  log_success "GCP project $project_id configured successfully!"
  
  echo "$project_id"
}

# Function to enable required GCP APIs
enable_gcp_apis() {
  local project_id="$1"
  
  log_info "Enabling required Google Cloud APIs for project: $project_id"
  
  local apis=(
    "firebase.googleapis.com"
    "firestore.googleapis.com"
    "storage.googleapis.com"
    "iam.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "secretmanager.googleapis.com"
    "aiplatform.googleapis.com"
  )
  
  for api in "${apis[@]}"; do
    log_info "Enabling $api..."
    if gcloud services enable "$api" --project="$project_id"; then
      log_success "Enabled $api"
    else
      log_warn "Failed to enable $api (may already be enabled)"
    fi
  done
}

# Function to check IAM permissions
check_iam_permissions() {
  local project_id="$1"
  
  log_info "Checking IAM permissions for project: $project_id"
  
  local required_permissions=(
    "iam.serviceAccounts.create"
    "iam.serviceAccounts.delete"
    "iam.serviceAccounts.get"
    "iam.serviceAccounts.list"
    "iam.serviceAccountKeys.create"
    "iam.serviceAccountKeys.delete"
    "iam.serviceAccountKeys.list"
    "resourcemanager.projects.setIamPolicy"
    "resourcemanager.projects.getIamPolicy"
    "firebase.projects.get"
    "firebase.projects.update"
  )
  
  log_info "Testing IAM permissions..."
  local missing_permissions=()
  
  for permission in "${required_permissions[@]}"; do
    if ! gcloud projects test-iam-permissions "$project_id" --permissions="$permission" --format="value(permissions)" | grep -q "$permission"; then
      missing_permissions+=("$permission")
    fi
  done
  
  if [[ ${#missing_permissions[@]} -eq 0 ]]; then
    log_success "All required IAM permissions are available"
  else
    log_warn "Missing some IAM permissions:"
    for permission in "${missing_permissions[@]}"; do
      log_warn "  - $permission"
    done
    log_info "You may need to request additional permissions from your GCP administrator"
  fi
}

# Function to setup Secret Manager
setup_secret_manager() {
  local project_id="$1"
  
  log_info "Setting up Google Secret Manager for project: $project_id"
  
  # Check if Secret Manager API is enabled
  if ! gcloud services list --enabled --filter="name:secretmanager.googleapis.com" --project="$project_id" --format="value(name)" | grep -q secretmanager; then
    log_info "Enabling Secret Manager API..."
    gcloud services enable secretmanager.googleapis.com --project="$project_id"
  fi
  
  log_success "Secret Manager is ready for use"
  log_info "You can create secrets with: gcloud secrets create SECRET_NAME --project=$project_id"
  log_info "You can add secret versions with: echo 'secret-value' | gcloud secrets versions add SECRET_NAME --data-file=- --project=$project_id"
}

# Function to configure gcloud for development
configure_gcloud_dev() {
  local project_id="$1"
  
  log_info "Configuring gcloud for development..."
  
  # Set default region and zone
  log_info "Setting default region and zone..."
  gcloud config set compute/region us-central1
  gcloud config set compute/zone us-central1-a
  
  # Enable application default credentials
  log_info "Setting up Application Default Credentials..."
  gcloud auth application-default login
  
  log_success "gcloud configured for development"
}

# Function to display current configuration
show_gcp_config() {
  log_info "Current Google Cloud configuration:"
  gcloud config list
  
  log_info ""
  log_info "Active account:"
  gcloud auth list --filter=status:ACTIVE
  
  log_info ""
  log_info "Available projects:"
  gcloud projects list --format="table(projectId,name)"
}

# Main function
main() {
  local command="${1:-setup}"
  local project_id="${2:-}"
  local create_new="false"
  
  case "$command" in
    "setup")
      log_info "=== Google Cloud Platform Configuration Setup ==="
      
      # Check prerequisites
      check_gcloud_cli || exit 1
      
      # Authenticate with GCP
      gcp_login
      
      # List available projects
      list_gcp_projects
      
      # Setup project
      project_id=$(setup_gcp_project "$project_id")
      
      # Enable APIs
      enable_gcp_apis "$project_id"
      
      # Check permissions
      check_iam_permissions "$project_id"
      
      # Setup Secret Manager
      setup_secret_manager "$project_id"
      
      # Configure for development
      configure_gcloud_dev "$project_id"
      
      log_success "=== GCP setup complete! ==="
      log_info "Project ID: $project_id"
      log_info "Next steps:"
      log_info "1. Run 'scripts/service-accounts.sh $project_id' to create service accounts"
      log_info "2. Run 'scripts/secrets-management.sh $project_id' to manage secrets"
      ;;
    "create-project")
      log_info "=== Creating New GCP Project ==="
      
      # Check prerequisites
      check_gcloud_cli || exit 1
      
      # Authenticate with GCP
      gcp_login
      
      if [[ -z "$project_id" ]]; then
        log_error "Project ID is required for create-project command"
        log_info "Usage: $0 create-project PROJECT_ID"
        exit 1
      fi
      
      # Create the project
      create_gcp_project "$project_id"
      
      # Set as default
      gcloud config set project "$project_id"
      
      # Enable APIs
      enable_gcp_apis "$project_id"
      
      # Setup Secret Manager
      setup_secret_manager "$project_id"
      
      # Configure for development
      configure_gcloud_dev "$project_id"
      
      log_success "=== New GCP project $project_id created and configured! ==="
      log_info "Next steps:"
      log_info "1. Run 'scripts/service-accounts.sh create $project_id' to create service accounts"
      log_info "2. Run 'scripts/setup-firebase.sh $project_id' to configure Firebase"
      ;;
    "setup-new")
      log_info "=== Google Cloud Platform Setup with New Project ==="
      
      # Check prerequisites
      check_gcloud_cli || exit 1
      
      # Authenticate with GCP
      gcp_login
      
      if [[ -z "$project_id" ]]; then
        log_error "Project ID is required for setup-new command"
        log_info "Usage: $0 setup-new PROJECT_ID"
        exit 1
      fi
      
      # Setup project with creation if needed
      project_id=$(setup_gcp_project "$project_id" "true")
      
      # Enable APIs
      enable_gcp_apis "$project_id"
      
      # Check permissions
      check_iam_permissions "$project_id"
      
      # Setup Secret Manager
      setup_secret_manager "$project_id"
      
      # Configure for development
      configure_gcloud_dev "$project_id"
      
      log_success "=== GCP setup complete with new project! ==="
      log_info "Project ID: $project_id"
      log_info "Next steps:"
      log_info "1. Run 'scripts/service-accounts.sh create $project_id' to create service accounts"
      log_info "2. Run 'scripts/setup-firebase.sh $project_id' to configure Firebase"
      ;;
    "config")
      show_gcp_config
      ;;
    "login")
      gcp_login
      ;;
    "enable-apis")
      if [[ -z "$project_id" ]]; then
        project_id=$(gcloud config get-value project)
      fi
      enable_gcp_apis "$project_id"
      ;;
    *)
      log_error "Unknown command: $command"
      log_info "Usage: $0 [setup|setup-new|create-project|config|login|enable-apis] [project-id]"
      log_info "Commands:"
      log_info "  setup           - Setup existing GCP project"
      log_info "  setup-new       - Setup GCP project (create if needed)"
      log_info "  create-project  - Create new GCP project only"
      log_info "  config          - Show current GCP configuration"
      log_info "  login           - Login to GCP"
      log_info "  enable-apis     - Enable required APIs"
      exit 1
      ;;
  esac
}

# Run main function with all arguments
main "$@"