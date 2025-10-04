#!/usr/bin/env bash
# Environment Utilities Script
# Shared utilities for environment variable management and encoding/decoding

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1" >&2; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1" >&2; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Function to encode JSON to base64
encode_json_to_base64() {
  local json_file="$1"
  
  if [[ ! -f "$json_file" ]]; then
    log_error "JSON file not found: $json_file"
    return 1
  fi
  
  log_info "Encoding JSON file to base64: $json_file"
  base64 -w 0 < "$json_file"
}

# Function to decode base64 to JSON
decode_base64_to_json() {
  local encoded_string="$1"
  local output_file="${2:-decoded.json}"
  
  log_info "Decoding base64 to JSON: $output_file"
  echo "$encoded_string" | base64 -d > "$output_file"
  
  if [[ -f "$output_file" ]]; then
    log_success "Decoded to: $output_file"
    return 0
  else
    log_error "Failed to decode base64 string"
    return 1
  fi
}

# Function to validate JSON format
validate_json() {
  local json_content="$1"
  
  if echo "$json_content" | jq empty 2>/dev/null; then
    log_success "Valid JSON format"
    return 0
  else
    log_error "Invalid JSON format"
    return 1
  fi
}

# Function to extract Firebase config from environment
get_firebase_config() {
  local env_file="${1:-.env.local}"
  
  if [[ ! -f "$env_file" ]]; then
    log_error "Environment file not found: $env_file"
    return 1
  fi
  
  log_info "Extracting Firebase configuration from: $env_file"
  
  local api_key auth_domain project_id app_id
  
  api_key=$(grep "^NEXT_PUBLIC_FIREBASE_API_KEY=" "$env_file" | cut -d'=' -f2- | tr -d '"')
  auth_domain=$(grep "^NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=" "$env_file" | cut -d'=' -f2- | tr -d '"')
  project_id=$(grep "^NEXT_PUBLIC_FIREBASE_PROJECT_ID=" "$env_file" | cut -d'=' -f2- | tr -d '"')
  app_id=$(grep "^NEXT_PUBLIC_FIREBASE_APP_ID=" "$env_file" | cut -d'=' -f2- | tr -d '"')
  
  if [[ -n "$api_key" && -n "$auth_domain" && -n "$project_id" && -n "$app_id" ]]; then
    log_success "Firebase configuration extracted successfully"
    echo "API Key: $api_key"
    echo "Auth Domain: $auth_domain"
    echo "Project ID: $project_id"
    echo "App ID: $app_id"
  else
    log_error "Incomplete Firebase configuration in $env_file"
    return 1
  fi
}

# Function to get service account JSON from environment
get_service_account_json() {
  local env_file="${1:-.env.local}"
  
  if [[ ! -f "$env_file" ]]; then
    log_error "Environment file not found: $env_file"
    return 1
  fi
  
  local encoded_json
  encoded_json=$(grep "^FIREBASE_SERVICE_ACCOUNT_JSON=" "$env_file" | cut -d'=' -f2- | tr -d '"')
  
  if [[ -z "$encoded_json" ]]; then
    log_error "FIREBASE_SERVICE_ACCOUNT_JSON not found in $env_file"
    return 1
  fi
  
  log_info "Decoding service account JSON from environment..."
  
  # Try to decode as base64 first
  if echo "$encoded_json" | base64 -d 2>/dev/null | jq empty 2>/dev/null; then
    echo "$encoded_json" | base64 -d
  elif echo "$encoded_json" | jq empty 2>/dev/null; then
    # It's already a JSON string
    echo "$encoded_json"
  else
    log_error "Invalid service account JSON format in environment"
    return 1
  fi
}

# Function to update environment variable in file
update_env_var() {
  local env_file="$1"
  local var_name="$2"
  local var_value="$3"
  local backup="${4:-true}"
  
  if [[ ! -f "$env_file" ]]; then
    log_info "Creating new environment file: $env_file"
    touch "$env_file"
  fi
  
  if [[ "$backup" == "true" ]]; then
    cp "$env_file" "${env_file}.backup.$(date +%Y%m%d-%H%M%S)"
    log_info "Backed up existing environment file"
  fi
  
  # Escape special characters in the value
  local escaped_value
  escaped_value=$(printf '%s\n' "$var_value" | sed 's/[[\.*^$()+?{|]/\\&/g')
  
  if grep -q "^${var_name}=" "$env_file"; then
    # Update existing variable
    if command -v gsed >/dev/null 2>&1; then
      gsed -i "s|^${var_name}=.*|${var_name}=${escaped_value}|" "$env_file"
    else
      sed -i "s|^${var_name}=.*|${var_name}=${escaped_value}|" "$env_file"
    fi
    log_success "Updated $var_name in $env_file"
  else
    # Add new variable
    echo "${var_name}=${var_value}" >> "$env_file"
    log_success "Added $var_name to $env_file"
  fi
}

# Function to validate environment file
validate_env_file() {
  local env_file="${1:-.env.local}"
  
  if [[ ! -f "$env_file" ]]; then
    log_error "Environment file not found: $env_file"
    return 1
  fi
  
  log_info "Validating environment file: $env_file"
  
  local required_vars=(
    "NEXT_PUBLIC_FIREBASE_API_KEY"
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    "NEXT_PUBLIC_FIREBASE_APP_ID"
    "FIREBASE_SERVICE_ACCOUNT_JSON"
  )
  
  local missing_vars=()
  
  for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" "$env_file" || [[ -z "$(grep "^${var}=" "$env_file" | cut -d'=' -f2-)" ]]; then
      missing_vars+=("$var")
    fi
  done
  
  if [[ ${#missing_vars[@]} -eq 0 ]]; then
    log_success "All required environment variables are present"
    
    # Validate service account JSON
    local sa_json
    if sa_json=$(get_service_account_json "$env_file"); then
      if validate_json "$sa_json"; then
        log_success "Service account JSON is valid"
      else
        log_error "Service account JSON is invalid"
        return 1
      fi
    else
      log_error "Failed to decode service account JSON"
      return 1
    fi
    
  else
    log_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
      log_error "  - $var"
    done
    return 1
  fi
}

# Function to generate environment template
generate_env_template() {
  local template_file="${1:-.env.example}"
  
  log_info "Generating environment template: $template_file"
  
  cat > "$template_file" <<EOF
# Firebase Web (Client) Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here

# Firebase Admin (Server) Configuration
# Paste the FULL service account JSON (or a base64 encoded version)
FIREBASE_SERVICE_ACCOUNT_JSON=your_service_account_json_here

# Google AI API Key (for Genkit)
GOOGLE_GENAI_API_KEY=your_google_ai_api_key_here

# Development Settings
NODE_ENV=development
EOF
  
  log_success "Environment template generated: $template_file"
}

# Function to copy environment template
copy_env_template() {
  local source_file="${1:-.env.example}"
  local target_file="${2:-.env.local}"
  
  if [[ ! -f "$source_file" ]]; then
    log_error "Source environment file not found: $source_file"
    return 1
  fi
  
  if [[ -f "$target_file" ]]; then
    log_warn "Target file already exists: $target_file"
    read -p "Do you want to overwrite it? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
      log_info "Copy cancelled"
      return 0
    fi
  fi
  
  cp "$source_file" "$target_file"
  log_success "Copied $source_file to $target_file"
  log_info "Please edit $target_file and fill in your actual values"
}

# Function to show environment status
show_env_status() {
  local env_file="${1:-.env.local}"
  
  log_info "Environment Status Report"
  log_info "========================"
  
  if [[ -f "$env_file" ]]; then
    log_success "Environment file exists: $env_file"
    
    if validate_env_file "$env_file"; then
      log_success "Environment file is valid"
    else
      log_error "Environment file has issues"
    fi
    
    # Show non-sensitive configuration
    log_info ""
    log_info "Firebase Configuration:"
    get_firebase_config "$env_file" 2>/dev/null || log_warn "Failed to extract Firebase config"
    
  else
    log_error "Environment file not found: $env_file"
    log_info "Run: $0 copy-template to create one from .env.example"
  fi
}

# Main function for when script is run directly
main() {
  local command="${1:-status}"
  
  case "$command" in
    "encode")
      local json_file="${2:-}"
      if [[ -z "$json_file" ]]; then
        log_error "JSON file path required"
        log_info "Usage: $0 encode JSON_FILE"
        exit 1
      fi
      encode_json_to_base64 "$json_file"
      ;;
    "decode")
      local encoded_string="${2:-}"
      local output_file="${3:-decoded.json}"
      if [[ -z "$encoded_string" ]]; then
        log_error "Base64 encoded string required"
        log_info "Usage: $0 decode ENCODED_STRING [OUTPUT_FILE]"
        exit 1
      fi
      decode_base64_to_json "$encoded_string" "$output_file"
      ;;
    "validate")
      local env_file="${2:-.env.local}"
      validate_env_file "$env_file"
      ;;
    "config")
      local env_file="${2:-.env.local}"
      get_firebase_config "$env_file"
      ;;
    "service-account")
      local env_file="${2:-.env.local}"
      get_service_account_json "$env_file"
      ;;
    "update")
      local env_file="${2:-.env.local}"
      local var_name="${3:-}"
      local var_value="${4:-}"
      if [[ -z "$var_name" ]] || [[ -z "$var_value" ]]; then
        log_error "Variable name and value required"
        log_info "Usage: $0 update ENV_FILE VAR_NAME VAR_VALUE"
        exit 1
      fi
      update_env_var "$env_file" "$var_name" "$var_value"
      ;;
    "generate-template")
      local template_file="${2:-.env.example}"
      generate_env_template "$template_file"
      ;;
    "copy-template")
      local source_file="${2:-.env.example}"
      local target_file="${3:-.env.local}"
      copy_env_template "$source_file" "$target_file"
      ;;
    "status")
      local env_file="${2:-.env.local}"
      show_env_status "$env_file"
      ;;
    *)
      log_error "Unknown command: $command"
      log_info "Usage: $0 [encode|decode|validate|config|service-account|update|generate-template|copy-template|status] [args...]"
      log_info "Commands:"
      log_info "  encode JSON_FILE                                    - Encode JSON file to base64"
      log_info "  decode ENCODED_STRING [OUTPUT_FILE]                 - Decode base64 to JSON file"
      log_info "  validate [ENV_FILE]                                 - Validate environment file"
      log_info "  config [ENV_FILE]                                   - Show Firebase configuration"
      log_info "  service-account [ENV_FILE]                          - Show service account JSON"
      log_info "  update ENV_FILE VAR_NAME VAR_VALUE                  - Update environment variable"
      log_info "  generate-template [TEMPLATE_FILE]                   - Generate environment template"
      log_info "  copy-template [SOURCE_FILE] [TARGET_FILE]           - Copy environment template"
      log_info "  status [ENV_FILE]                                   - Show environment status"
      exit 1
      ;;
  esac
}

# Only run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi