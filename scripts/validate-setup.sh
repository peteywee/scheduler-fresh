#!/usr/bin/env bash
# Validation Script for CLI Configuration Setup
# Tests that all scripts are working correctly

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[TEST]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

# Ensure we're in project root
cd "$(dirname "$0")/.."

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to run test
run_test() {
  local test_name="$1"
  local test_command="$2"
  
  log_info "Testing: $test_name"
  ((TESTS_TOTAL++))
  
  if eval "$test_command" >/dev/null 2>&1; then
    log_success "$test_name"
    ((TESTS_PASSED++))
  else
    log_error "$test_name"
    ((TESTS_FAILED++))
  fi
}

# Function to test script existence and executability
test_script_exists() {
  local script_path="$1"
  local script_name="$2"
  
  run_test "Script exists: $script_name" "[[ -f '$script_path' ]]"
  run_test "Script executable: $script_name" "[[ -x '$script_path' ]]"
}

# Function to test command availability
test_command_available() {
  local command="$1"
  run_test "Command available: $command" "command -v '$command'"
}

# Function to test script help output
test_script_help() {
  local script_path="$1"
  local script_name="$2"
  
  run_test "Script shows help: $script_name" "'$script_path' --help 2>&1 | grep -q 'Usage\\|Commands\\|help' || '$script_path' 2>&1 | grep -q 'Usage\\|Commands'"
}

# Main validation function
main() {
  echo -e "${BLUE}"
  echo "========================================================"
  echo "  CLI Configuration Setup Validation"
  echo "========================================================"
  echo -e "${NC}"
  echo ""
  
  # Test prerequisites
  log_info "Testing Prerequisites"
  test_command_available "gcloud"
  test_command_available "jq"
  test_command_available "base64"
  
  # Test pnpm and Firebase CLI
  run_test "pnpm available" "command -v pnpm || command -v npm"
  
  # Test script files
  log_info ""
  log_info "Testing Script Files"
  test_script_exists "scripts/setup-gcp.sh" "GCP Setup"
  test_script_exists "scripts/setup-firebase.sh" "Firebase Setup"
  test_script_exists "scripts/service-accounts.sh" "Service Accounts"
  test_script_exists "scripts/secrets-management.sh" "Secrets Management"
  test_script_exists "scripts/env-utils.sh" "Environment Utilities"
  test_script_exists "scripts/setup-cli-config.sh" "Master Setup"
  
  # Test script help functionality
  log_info ""
  log_info "Testing Script Help Output"
  test_script_help "scripts/setup-gcp.sh" "GCP Setup Help"
  test_script_help "scripts/service-accounts.sh" "Service Accounts Help"
  test_script_help "scripts/secrets-management.sh" "Secrets Management Help"
  test_script_help "scripts/env-utils.sh" "Environment Utilities Help"
  test_script_help "scripts/setup-cli-config.sh" "Master Setup Help"
  
  # Test environment utilities functionality
  log_info ""
  log_info "Testing Environment Utilities"
  
  # Create a test JSON file
  echo '{"test": "value", "number": 123}' > /tmp/test.json
  
  # Test JSON encoding/decoding
  run_test "JSON to base64 encoding" "scripts/env-utils.sh encode /tmp/test.json | grep -q '^[A-Za-z0-9+/]*={0,2}$'"
  
  # Test base64 decoding
  local encoded
  encoded=$(scripts/env-utils.sh encode /tmp/test.json 2>/dev/null || echo "")
  if [[ -n "$encoded" ]]; then
    run_test "Base64 to JSON decoding" "scripts/env-utils.sh decode '$encoded' /tmp/decoded.json && [[ -f /tmp/decoded.json ]]"
    run_test "Decoded JSON validity" "jq empty /tmp/decoded.json 2>/dev/null"
  else
    log_warn "Skipping decode test (encode failed)"
    ((TESTS_TOTAL++))
  fi
  
  # Test environment template generation
  run_test "Environment template generation" "scripts/env-utils.sh generate-template /tmp/test.env.example && [[ -f /tmp/test.env.example ]]"
  
  # Clean up test files
  rm -f /tmp/test.json /tmp/decoded.json /tmp/test.env.example
  
  # Test documentation
  log_info ""
  log_info "Testing Documentation"
  run_test "CLI setup documentation exists" "[[ -f 'docs/firebase-gcp-cli-setup.md' ]]"
  run_test "Documentation is not empty" "[[ -s 'docs/firebase-gcp-cli-setup.md' ]]"
  
  # Test project structure
  log_info ""
  log_info "Testing Project Structure"
  run_test "Scripts directory exists" "[[ -d 'scripts' ]]"
  run_test "Docs directory exists" "[[ -d 'docs' ]]"
  run_test "Environment example exists" "[[ -f '.env.example' ]]"
  run_test "Package.json exists" "[[ -f 'package.json' ]]"
  run_test "Firebase config scripts directory" "[[ -f 'resume-firebase-auth.sh' ]]"
  
  # Test integration with existing workflow
  log_info ""
  log_info "Testing Integration with Existing Workflow"
  run_test "README mentions CLI setup" "grep -q -i 'cli\\|command\\|script' README.md"
  
  # Summary
  echo ""
  echo -e "${BLUE}========================================================"
  echo "  Validation Summary"
  echo -e "========================================================${NC}"
  echo ""
  echo "Tests passed: $TESTS_PASSED"
  echo "Tests failed: $TESTS_FAILED"
  echo "Total tests:  $TESTS_TOTAL"
  echo ""
  
  if [[ $TESTS_FAILED -eq 0 ]]; then
    log_success "All tests passed! CLI configuration setup is ready to use."
    echo ""
    echo "Next steps:"
    echo "1. Run './scripts/setup-cli-config.sh interactive' to configure your project"
    echo "2. Follow the documentation in docs/firebase-gcp-cli-setup.md"
    echo "3. Test the setup with your actual Firebase/GCP project"
    exit 0
  else
    log_error "Some tests failed. Please check the setup."
    echo ""
    echo "Common issues:"
    echo "- Make sure all required tools are installed (gcloud, jq, base64)"
    echo "- Ensure scripts have proper execute permissions"
    echo "- Check that all script files are present in the scripts/ directory"
    exit 1
  fi
}

# Run validation
main "$@"