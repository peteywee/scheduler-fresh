#!/usr/bin/env bash
# Master Setup Script for Firebase and GCP Configuration
# Orchestrates the complete setup process for Firebase and Google Cloud Platform

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_header() { echo -e "${CYAN}[SETUP]${NC} $1"; }

# Ensure we're in project root
cd "$(dirname "$0")/.."

# Global variables
PROJECT_ID=""
FIREBASE_SA_EMAIL=""
AI_SA_EMAIL=""

# Function to show welcome message
show_welcome() {
  echo -e "${CYAN}"
  echo "=================================================================="
  echo "  🔧 Firebase & GCP Configuration Setup for Scheduler Fresh"
  echo "=================================================================="
  echo -e "${NC}"
  echo ""
  echo "This script will help you configure:"
  echo "  ✓ Firebase project and authentication"
  echo "  ✓ Google Cloud Platform services and APIs"
  echo "  ✓ Service accounts with proper permissions"
  echo "  ✓ Secret management using Google Secret Manager"
  echo "  ✓ Environment variable configuration"
  echo ""
  echo "Prerequisites:"
  echo "  • Google Cloud CLI (gcloud) installed and authenticated"
  echo "  • Firebase CLI available (will use pnpm dlx firebase-tools)"
  echo "  • Proper permissions in your GCP project"
  echo ""
  read -p "Press Enter to continue, or Ctrl+C to exit..."
  echo ""
}

# Function to check prerequisites
check_prerequisites() {
  log_header "Checking Prerequisites"
  
  local errors=0
  
  # Check if gcloud is installed
  if command -v gcloud >/dev/null 2>&1; then
    log_success "Google Cloud CLI available ($(gcloud version --format='value(Google Cloud SDK)'))"
  else
    log_error "Google Cloud CLI not found. Please install it first:"
    log_info "https://cloud.google.com/sdk/docs/install"
    ((errors++))
  fi
  
  # Check if pnpm is available
  if command -v pnpm >/dev/null 2>&1; then
    log_success "pnpm available ($(pnpm --version))"
  else
    log_warn "pnpm not found. Installing..."
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    export PNPM_HOME="$HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME:$PATH"
    if command -v pnpm >/dev/null 2>&1; then
      log_success "pnpm installed successfully"
    else
      log_error "Failed to install pnpm"
      ((errors++))
    fi
  fi
  
  # Check if Firebase CLI is available via pnpm
  if pnpm dlx firebase-tools --version >/dev/null 2>&1; then
    log_success "Firebase CLI available via pnpm ($(pnpm dlx firebase-tools --version))"
  else
    log_error "Firebase CLI not available via pnpm"
    ((errors++))
  fi
  
  # Check if required tools are available
  for tool in jq base64; do
    if command -v "$tool" >/dev/null 2>&1; then
      log_success "$tool available"
    else
      log_error "$tool not found. Please install it first."
      ((errors++))
    fi
  done
  
  if [[ $errors -gt 0 ]]; then
    log_error "Prerequisites check failed. Please resolve the issues above."
    exit 1
  fi
  
  log_success "All prerequisites satisfied!"
  echo ""
}

# Function to setup GCP project
setup_gcp() {
  log_header "Setting up Google Cloud Platform"
  
  # Run GCP setup script
  ./scripts/setup-gcp.sh setup
  
  # Get the configured project ID
  PROJECT_ID=$(gcloud config get-value project)
  log_success "GCP project configured: $PROJECT_ID"
  echo ""
}

# Function to setup GCP project with creation
setup_gcp_new() {
  log_header "Setting up Google Cloud Platform (with new project creation)"
  
  local project_id="${1:-}"
  
  if [[ -z "$project_id" ]]; then
    log_error "Project ID is required for new project setup"
    return 1
  fi
  
  # Run GCP setup script with new project creation
  ./scripts/setup-gcp.sh setup-new "$project_id"
  
  # Get the configured project ID
  PROJECT_ID=$(gcloud config get-value project)
  log_success "GCP project configured: $PROJECT_ID"
  echo ""
}

# Function to create GCP project only
create_gcp_project_only() {
  log_header "Creating new Google Cloud Platform project"
  
  local project_id="${1:-}"
  
  if [[ -z "$project_id" ]]; then
    log_error "Project ID is required for project creation"
    return 1
  fi
  
  # Run GCP project creation script
  ./scripts/setup-gcp.sh create-project "$project_id"
  
  # Get the configured project ID
  PROJECT_ID=$(gcloud config get-value project)
  log_success "GCP project created and configured: $PROJECT_ID"
  echo ""
}

# Function to setup Firebase
setup_firebase() {
  log_header "Setting up Firebase"
  
  if [[ -z "$PROJECT_ID" ]]; then
    PROJECT_ID=$(gcloud config get-value project)
  fi
  
  # Run Firebase setup script
  ./scripts/setup-firebase.sh "$PROJECT_ID"
  
  log_success "Firebase configured for project: $PROJECT_ID"
  echo ""
}

# Function to create service accounts
setup_service_accounts() {
  log_header "Creating Service Accounts"
  
  # Run service accounts setup script
  ./scripts/service-accounts.sh create "$PROJECT_ID"
  
  # Get service account emails
  FIREBASE_SA_EMAIL="scheduler-fresh-firebase@$PROJECT_ID.iam.gserviceaccount.com"
  AI_SA_EMAIL="scheduler-fresh-ai@$PROJECT_ID.iam.gserviceaccount.com"
  
  log_success "Service accounts created:"
  log_info "  Firebase: $FIREBASE_SA_EMAIL"
  log_info "  AI: $AI_SA_EMAIL"
  echo ""
}

# Function to setup secrets management
setup_secrets() {
  log_header "Setting up Secrets Management"
  
  # Setup secret access for service accounts
  ./scripts/secrets-management.sh setup-access "$PROJECT_ID" "$FIREBASE_SA_EMAIL"
  ./scripts/secrets-management.sh setup-access "$PROJECT_ID" "$AI_SA_EMAIL"
  
  # Sync environment variables to Secret Manager
  if [[ -f ".env.local" ]]; then
    log_info "Syncing environment variables to Secret Manager..."
    ./scripts/secrets-management.sh sync-to-secrets "$PROJECT_ID" ".env.local"
  else
    log_warn ".env.local not found. Skipping sync to Secret Manager."
  fi
  
  log_success "Secrets management configured"
  echo ""
}

# Function to validate setup
validate_setup() {
  log_header "Validating Setup"
  
  local errors=0
  
  # Validate environment file
  if ./scripts/env-utils.sh validate .env.local; then
    log_success "Environment file validation passed"
  else
    log_error "Environment file validation failed"
    ((errors++))
  fi
  
  # Validate service accounts
  if ./scripts/service-accounts.sh validate "$PROJECT_ID" "$FIREBASE_SA_EMAIL"; then
    log_success "Firebase service account validation passed"
  else
    log_error "Firebase service account validation failed"
    ((errors++))
  fi
  
  # Validate secret access
  if ./scripts/secrets-management.sh list "$PROJECT_ID" >/dev/null 2>&1; then
    log_success "Secret Manager access validated"
  else
    log_warn "Secret Manager access validation failed (may be normal if no secrets created yet)"
  fi
  
  # Test Firebase emulators configuration
  if [[ -f "firebase.json" ]]; then
    log_success "Firebase emulators configuration found"
  else
    log_warn "Firebase emulators configuration not found"
  fi
  
  if [[ $errors -eq 0 ]]; then
    log_success "Setup validation completed successfully!"
  else
    log_error "Setup validation failed with $errors error(s)"
    return 1
  fi
  
  echo ""
}

# Function to show next steps
show_next_steps() {
  log_header "Setup Complete! Next Steps"
  
  echo "🎉 Your Firebase and GCP configuration is now ready!"
  echo ""
  echo "Configuration Summary:"
  echo "  • Project ID: $PROJECT_ID"
  echo "  • Firebase Service Account: $FIREBASE_SA_EMAIL"
  echo "  • AI Service Account: $AI_SA_EMAIL"
  echo "  • Environment file: .env.local"
  echo "  • Firebase config: firebase.json"
  echo ""
  echo "Next steps to complete your setup:"
  echo ""
  echo "1. 📱 Configure Firebase Authentication:"
  echo "   Open: https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"
  echo "   • Enable Google sign-in provider"
  echo "   • Add your domain to authorized domains"
  echo ""
  echo "2. 🗄️  Set up Firestore Database:"
  echo "   Open: https://console.firebase.google.com/project/$PROJECT_ID/firestore"
  echo "   • Create database in production mode"
  echo "   • Configure security rules as needed"
  echo ""
  echo "3. 🤖 Configure Google AI API:"
  echo "   • Get your API key from Google AI Studio"
  echo "   • Add it to .env.local as GOOGLE_GENAI_API_KEY"
  echo ""
  echo "4. 🚀 Start Development:"
  echo "   pnpm run dev    # Start both web and API servers"
  echo ""
  echo "Useful commands:"
  echo "  scripts/env-utils.sh status           # Check environment status"
  echo "  scripts/service-accounts.sh list $PROJECT_ID  # List service accounts"
  echo "  scripts/secrets-management.sh list $PROJECT_ID  # List secrets"
  echo ""
  echo "For help with any script, run it with no arguments to see usage."
}

# Function to show setup menu
show_menu() {
  echo -e "${CYAN}Setup Options:${NC}"
  echo "1. Full setup (recommended for first-time setup)"
  echo "2. GCP setup only"
  echo "3. Firebase setup only"
  echo "4. Service accounts setup only"
  echo "5. Secrets management setup only"
  echo "6. Validate existing setup"
  echo "7. Show configuration status"
  echo "8. Exit"
  echo ""
  read -p "Choose an option (1-8): " choice
  echo ""
  
  case "$choice" in
    1)
      run_full_setup
      ;;
    2)
      setup_gcp
      ;;
    3)
      setup_firebase
      ;;
    4)
      setup_service_accounts
      ;;
    5)
      setup_secrets
      ;;
    6)
      validate_setup
      ;;
    7)
      show_status
      ;;
    8)
      log_info "Exiting setup"
      exit 0
      ;;
    *)
      log_error "Invalid option. Please choose 1-8."
      show_menu
      ;;
  esac
}

# Function to run full setup
run_full_setup() {
  log_header "Running Full Setup"
  
  setup_gcp
  setup_firebase
  setup_service_accounts
  setup_secrets
  validate_setup
  show_next_steps
}

# Function to run full setup with new project creation
run_full_setup_new() {
  log_header "Running Full Setup with New Project Creation"
  
  local project_id="${1:-}"
  
  if [[ -z "$project_id" ]]; then
    log_error "Project ID is required for new project setup"
    return 1
  fi
  
  setup_gcp_new "$project_id"
  setup_firebase
  setup_service_accounts
  setup_secrets
  validate_setup
  show_next_steps
}

# Function to show current status
show_status() {
  log_header "Configuration Status"
  
  # Show environment status
  ./scripts/env-utils.sh status
  
  echo ""
  
  # Show GCP status
  if command -v gcloud >/dev/null 2>&1; then
    ./scripts/setup-gcp.sh config
  fi
  
  echo ""
  
  # Show service accounts if project is configured
  local current_project
  current_project=$(gcloud config get-value project 2>/dev/null || echo "")
  if [[ -n "$current_project" ]]; then
    log_info "Service accounts for project: $current_project"
    ./scripts/service-accounts.sh list "$current_project" 2>/dev/null || log_warn "Failed to list service accounts"
  fi
}

# Function to make scripts executable
make_scripts_executable() {
  chmod +x scripts/*.sh
  log_success "Made all scripts executable"
}

# Main function
main() {
  local command="${1:-interactive}"
  local project_id="${2:-}"
  
  # Make scripts executable
  make_scripts_executable
  
  case "$command" in
    "full"|"setup")
      show_welcome
      check_prerequisites
      if [[ -n "$project_id" ]]; then
        run_full_setup_new "$project_id"
      else
        run_full_setup
      fi
      ;;
    "full-new")
      if [[ -z "$project_id" ]]; then
        log_error "Project ID is required for full-new command"
        log_info "Usage: $0 full-new PROJECT_ID"
        exit 1
      fi
      show_welcome
      check_prerequisites
      run_full_setup_new "$project_id"
      ;;
    "create-project")
      if [[ -z "$project_id" ]]; then
        log_error "Project ID is required for create-project command"
        log_info "Usage: $0 create-project PROJECT_ID"
        exit 1
      fi
      check_prerequisites
      create_gcp_project_only "$project_id"
      ;;
    "gcp")
      check_prerequisites
      if [[ -n "$project_id" ]]; then
        setup_gcp_new "$project_id"
      else
        setup_gcp
      fi
      ;;
    "firebase")
      check_prerequisites
      setup_firebase
      ;;
    "service-accounts")
      check_prerequisites
      setup_service_accounts
      ;;
    "secrets")
      check_prerequisites
      setup_secrets
      ;;
    "validate")
      check_prerequisites
      validate_setup
      ;;
    "status")
      show_status
      ;;
    "interactive")
      show_welcome
      check_prerequisites
      show_menu
      ;;
    *)
      log_error "Unknown command: $command"
      log_info "Usage: $0 [full|full-new|create-project|gcp|firebase|service-accounts|secrets|validate|status|interactive] [project-id]"
      log_info "Commands:"
      log_info "  full              - Run complete setup process (with optional project-id for new project)"
      log_info "  full-new          - Run complete setup with new project creation (requires project-id)"
      log_info "  create-project    - Create new GCP project only (requires project-id)"
      log_info "  gcp               - Setup Google Cloud Platform only (with optional project-id for new project)"
      log_info "  firebase          - Setup Firebase only"
      log_info "  service-accounts  - Setup service accounts only"
      log_info "  secrets           - Setup secrets management only"
      log_info "  validate          - Validate existing setup"
      log_info "  status            - Show current configuration status"
      log_info "  interactive       - Show interactive menu (default)"
      log_info ""
      log_info "Examples:"
      log_info "  $0 full-new 9697in              # Create and setup new project '9697in'"
      log_info "  $0 full 9697in                  # Setup with project '9697in' (create if needed)"
      log_info "  $0 create-project my-project     # Just create a new project"
      exit 1
      ;;
  esac
}

# Run main function with all arguments
main "$@"