#!/usr/bin/env bash
# Firebase Configuration Setup Script
# Configures Firebase project using CLI commands and manages environment variables

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

# Check if pnpm is available
if ! command -v pnpm >/dev/null 2>&1; then
  log_error "pnpm not found. Installing..."
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  export PNPM_HOME="$HOME/.local/share/pnpm"
  export PATH="$PNPM_HOME:$PATH"
fi

# Function to check if Firebase CLI is available
check_firebase_cli() {
  if ! pnpm dlx firebase-tools --version >/dev/null 2>&1; then
    log_error "Firebase CLI not available via pnpm"
    return 1
  fi
  log_success "Firebase CLI available ($(pnpm dlx firebase-tools --version))"
}

# Function to authenticate with Firebase
firebase_login() {
  log_info "Checking Firebase authentication status..."
  
  if ! pnpm dlx firebase-tools login:list >/dev/null 2>&1; then
    log_warn "Not authenticated with Firebase. Starting login process..."
    pnpm dlx firebase-tools login --no-localhost
  else
    log_success "Already authenticated with Firebase"
    pnpm dlx firebase-tools login:list
  fi
}

# Function to list available Firebase projects
list_firebase_projects() {
  log_info "Listing available Firebase projects..."
  pnpm dlx firebase-tools projects:list
}

# Function to select or create Firebase project
setup_firebase_project() {
  local project_id="${1:-}"
  
  if [[ -z "$project_id" ]]; then
    log_info "Please provide a project ID or select from the list above:"
    read -p "Enter Firebase Project ID: " project_id
  fi
  
  if [[ -z "$project_id" ]]; then
    log_error "Project ID is required"
    return 1
  fi
  
  log_info "Setting up Firebase project: $project_id"
  
  # Initialize Firebase in the project
  if [[ ! -f "firebase.json" ]]; then
    log_info "Initializing Firebase configuration..."
    echo "y" | pnpm dlx firebase-tools init --project="$project_id"
  else
    log_info "Firebase already initialized. Updating project..."
    pnpm dlx firebase-tools use "$project_id"
  fi
  
  # Get project config
  log_info "Retrieving Firebase project configuration..."
  local config
  config=$(pnpm dlx firebase-tools apps:sdkconfig web --project="$project_id" 2>/dev/null || echo "")
  
  if [[ -z "$config" ]]; then
    log_warn "No web app found in project. Creating one..."
    read -p "Enter web app name (default: scheduler-fresh): " app_name
    app_name="${app_name:-scheduler-fresh}"
    
    pnpm dlx firebase-tools apps:create web "$app_name" --project="$project_id"
    config=$(pnpm dlx firebase-tools apps:sdkconfig web --project="$project_id")
  fi
  
  # Extract configuration values
  log_info "Extracting configuration values..."
  local api_key auth_domain app_id
  
  api_key=$(echo "$config" | grep -o '"apiKey": "[^"]*"' | cut -d'"' -f4)
  auth_domain=$(echo "$config" | grep -o '"authDomain": "[^"]*"' | cut -d'"' -f4)
  app_id=$(echo "$config" | grep -o '"appId": "[^"]*"' | cut -d'"' -f4)
  
  # Update .env.example and create .env.local
  log_info "Updating environment configuration..."
  
  # Backup existing .env.local if it exists
  if [[ -f ".env.local" ]]; then
    cp ".env.local" ".env.local.backup.$(date +%Y%m%d-%H%M%S)"
    log_info "Backed up existing .env.local"
  fi
  
  # Create or update .env.local
  cat > .env.local <<EOF
# Firebase Web (Client) Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=${api_key}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${auth_domain}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${project_id}
NEXT_PUBLIC_FIREBASE_APP_ID=${app_id}

# Firebase Admin (Server) Configuration
# Add your service account JSON here (see service-accounts.sh)
FIREBASE_SERVICE_ACCOUNT_JSON=
EOF
  
  # Update .env.example
  if ! grep -q "NEXT_PUBLIC_FIREBASE_API_KEY" .env.example 2>/dev/null; then
    cat >> .env.example <<EOF

# --- Firebase Web (Client) ---
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# --- Firebase Admin (Server) ---
# Paste the FULL service account JSON (or a base64 of it)
FIREBASE_SERVICE_ACCOUNT_JSON=
EOF
  fi
  
  log_success "Firebase project configured successfully!"
  log_info "Project ID: $project_id"
  log_info "API Key: $api_key"
  log_info "Auth Domain: $auth_domain"
  log_info "App ID: $app_id"
  
  echo "$project_id"
}

# Function to enable Firebase services
enable_firebase_services() {
  local project_id="$1"
  
  log_info "Enabling Firebase services for project: $project_id"
  
  # Enable Authentication
  log_info "Configuring Firebase Authentication..."
  log_info "Please enable authentication providers in Firebase Console:"
  log_info "https://console.firebase.google.com/project/$project_id/authentication/providers"
  
  # Enable Firestore
  log_info "Configuring Firestore..."
  log_info "Please set up Firestore in Firebase Console:"
  log_info "https://console.firebase.google.com/project/$project_id/firestore"
  
  # Enable Storage (if needed)
  log_info "Configuring Firebase Storage..."
  log_info "Please set up Storage in Firebase Console:"
  log_info "https://console.firebase.google.com/project/$project_id/storage"
}

# Function to setup Firebase emulators
setup_firebase_emulators() {
  log_info "Setting up Firebase emulators..."
  
  # Create firebase.json if it doesn't exist
  if [[ ! -f "firebase.json" ]]; then
    cat > firebase.json <<EOF
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
EOF
    log_success "Created firebase.json with emulator configuration"
  else
    log_info "firebase.json already exists"
  fi
  
  # Test emulators
  log_info "Testing Firebase emulators..."
  log_info "You can start emulators with: pnpm run dev:api"
}

# Main function
main() {
  log_info "=== Firebase Configuration Setup ==="
  
  # Check prerequisites
  check_firebase_cli || exit 1
  
  # Authenticate with Firebase
  firebase_login
  
  # List available projects
  list_firebase_projects
  
  # Setup project
  local project_id
  project_id=$(setup_firebase_project "${1:-}")
  
  # Enable services
  enable_firebase_services "$project_id"
  
  # Setup emulators
  setup_firebase_emulators
  
  log_success "=== Firebase setup complete! ==="
  log_info "Next steps:"
  log_info "1. Run 'scripts/service-accounts.sh $project_id' to set up service accounts"
  log_info "2. Configure authentication providers in Firebase Console"
  log_info "3. Set up Firestore database in Firebase Console"
  log_info "4. Run 'pnpm run dev' to start development servers"
}

# Run main function with all arguments
main "$@"