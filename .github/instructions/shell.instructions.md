---
applyTo: "scripts/**/*.sh"
description: "Shell script guidelines for DevOps automation"
---

# Shell Script Guidelines

## Script Header

```bash
#!/usr/bin/env bash
# Script: setup-firebase.sh
# Description: Initialize Firebase project and emulators
# Usage: ./scripts/setup-firebase.sh [project-id]
# Requires: firebase-tools, node, pnpm

set -euo pipefail  # Exit on error, undefined vars, pipe failures
IFS=$'\n\t'        # Safer word splitting
```

## Error Handling

```bash
# ✅ Always trap errors
trap 'echo "❌ Error on line $LINENO"' ERR

# ✅ Check command existence
if ! command -v firebase &> /dev/null; then
    echo "❌ firebase-tools not found. Install with: npm install -g firebase-tools"
    exit 1
fi

# ✅ Validate arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <project-id>"
    exit 1
fi
```

## Variables

```bash
# ✅ Use uppercase for environment variables
export NODE_ENV="${NODE_ENV:-development}"

# ✅ Use lowercase for local variables
readonly project_id="$1"
readonly config_file=".firebaserc"

# ✅ Quote all variable expansions
echo "Project ID: ${project_id}"
```

## Functions

```bash
# ✅ Document functions
# Checks if a Firebase project exists
# Arguments:
#   $1 - project_id
# Returns:
#   0 if project exists, 1 otherwise
check_project_exists() {
    local project_id="$1"

    if firebase projects:list | grep -q "${project_id}"; then
        return 0
    else
        return 1
    fi
}
```

## Output Formatting

```bash
# ✅ Use consistent emoji/symbols for output
echo "✅ Success: Firebase initialized"
echo "❌ Error: Configuration failed"
echo "⚠️  Warning: Using default settings"
echo "ℹ️  Info: Current environment: ${NODE_ENV}"
echo "🔧 Running: pnpm install"
```

## Conditionals

```bash
# ✅ Use [[ ]] for conditionals (bash)
if [[ -f ".env.local" ]]; then
    echo "✅ Environment file found"
elif [[ -f ".env" ]]; then
    echo "⚠️  Using .env instead of .env.local"
else
    echo "❌ No environment file found"
    exit 1
fi

# ✅ Test file/directory existence
if [[ ! -d "node_modules" ]]; then
    pnpm install
fi
```

## Loops

```bash
# ✅ Iterate over files safely
while IFS= read -r -d '' file; do
    echo "Processing: ${file}"
done < <(find . -name "*.json" -print0)

# ✅ Array iteration
local ports=(3000 8080 9099 9199)
for port in "${ports[@]}"; do
    if lsof -Pi ":${port}" -sTCP:LISTEN -t >/dev/null; then
        echo "⚠️  Port ${port} is in use"
    fi
done
```

## Security

```bash
# ✅ Never log secrets
if [[ -n "${FIREBASE_TOKEN:-}" ]]; then
    echo "ℹ️  Using CI token: ${FIREBASE_TOKEN:0:8}..."  # Only show first 8 chars
fi

# ✅ Use secure temp files
readonly temp_file=$(mktemp)
trap 'rm -f "${temp_file}"' EXIT

# ✅ Validate input
sanitize_input() {
    local input="$1"
    # Remove special characters
    echo "${input}" | tr -cd '[:alnum:]-_'
}
```

## Process Management

```bash
# ✅ Kill processes gracefully
kill_process_on_port() {
    local port="$1"
    local pid

    pid=$(lsof -ti ":${port}") || true

    if [[ -n "${pid}" ]]; then
        echo "🔧 Killing process on port ${port} (PID: ${pid})"
        kill -TERM "${pid}" 2>/dev/null || kill -KILL "${pid}" 2>/dev/null || true
    fi
}

# ✅ Wait for service to be ready
wait_for_service() {
    local url="$1"
    local max_attempts=30
    local attempt=0

    echo "⏳ Waiting for service at ${url}"

    while ! curl -s "${url}" > /dev/null; do
        attempt=$((attempt + 1))
        if [[ ${attempt} -ge ${max_attempts} ]]; then
            echo "❌ Service did not start in time"
            return 1
        fi
        sleep 1
    done

    echo "✅ Service is ready"
}
```

## JSON/YAML Processing

```bash
# ✅ Use jq for JSON
get_firebase_project_id() {
    jq -r '.projects.default' .firebaserc
}

# ✅ Use yq for YAML
get_node_version() {
    yq eval '.engines.node' package.json
}
```

## Logging

```bash
# ✅ Log to stderr for errors
log_error() {
    echo "❌ ERROR: $*" >&2
}

log_warning() {
    echo "⚠️  WARNING: $*" >&2
}

log_info() {
    echo "ℹ️  INFO: $*"
}

# ✅ Optional debug logging
DEBUG="${DEBUG:-false}"
debug() {
    if [[ "${DEBUG}" == "true" ]]; then
        echo "🐛 DEBUG: $*" >&2
    fi
}
```

## CI/CD Compatibility

```bash
# ✅ Detect CI environment
is_ci() {
    [[ "${CI:-false}" == "true" ]] || [[ -n "${GITHUB_ACTIONS:-}" ]]
}

# ✅ Adjust behavior for CI
if is_ci; then
    # Non-interactive mode
    export FIREBASE_NO_PROMPT=true
    export CI=true
else
    # Interactive mode
    echo "Running in development mode"
fi
```

## Best Practices

```bash
# ✅ Complete script template
#!/usr/bin/env bash
# Script: example-script.sh
# Description: Example shell script with best practices
# Usage: ./scripts/example-script.sh [options]

set -euo pipefail
IFS=$'\n\t'

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors (optional, for better UX)
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Functions
print_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -h, --help      Show this help message
    -v, --verbose   Enable verbose output
    -p, --project   Firebase project ID

Examples:
    $0 --project my-app-prod
    $0 -v --project my-app-dev
EOF
}

main() {
    # Parse arguments
    local project_id=""
    local verbose=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                print_usage
                exit 0
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -p|--project)
                project_id="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    # Validate required arguments
    if [[ -z "${project_id}" ]]; then
        echo "❌ Project ID is required"
        print_usage
        exit 1
    fi

    # Main logic
    echo "✅ Script completed successfully"
}

# Run main function
main "$@"
```

## Testing Scripts

```bash
# ✅ Add basic tests in script
run_tests() {
    local test_failed=0

    # Test 1: Check dependencies
    if ! command -v node &> /dev/null; then
        echo "❌ TEST FAILED: node not found"
        test_failed=1
    fi

    # Test 2: Check files
    if [[ ! -f "package.json" ]]; then
        echo "❌ TEST FAILED: package.json not found"
        test_failed=1
    fi

    if [[ ${test_failed} -eq 0 ]]; then
        echo "✅ All tests passed"
        return 0
    else
        echo "❌ Some tests failed"
        return 1
    fi
}

# Run tests if --test flag is passed
if [[ "${1:-}" == "--test" ]]; then
    run_tests
    exit $?
fi
```
