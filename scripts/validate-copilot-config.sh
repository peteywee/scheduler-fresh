#!/usr/bin/env bash
# validate-copilot-config.sh
# Validates Copilot configuration files

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly GITHUB_DIR="${PROJECT_ROOT}/.github"

echo "🔍 Validating Copilot Configuration"
echo "======================================"

# Colors
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Counters
checks_passed=0
checks_failed=0
warnings=0

# Check function
check() {
    local description="$1"
    local test_cmd="$2"
    
    if eval "$test_cmd"; then
        echo -e "${GREEN}✅${NC} $description"
        ((checks_passed++))
        return 0
    else
        echo -e "${RED}❌${NC} $description"
        ((checks_failed++))
        return 1
    fi
}

warn() {
    local message="$1"
    echo -e "${YELLOW}⚠️${NC}  $message"
    ((warnings++))
}

echo ""
echo "📋 Checking Core Files"
echo "----------------------"

check "Global instructions exist" \
    "[[ -f '${GITHUB_DIR}/copilot-instructions.md' ]]"

check "Setup steps exist" \
    "[[ -f '${GITHUB_DIR}/copilot-setup-steps.yml' ]]"

check "Instructions directory exists" \
    "[[ -d '${GITHUB_DIR}/instructions' ]]"

check "DeepSource config exists" \
    "[[ -f '${PROJECT_ROOT}/.deepsource.toml' ]]"

echo ""
echo "📝 Checking Instruction Files"
echo "-----------------------------"

# Expected instruction files
readonly expected_instructions=(
    "api.instructions.md"
    "components.instructions.md"
    "copilotinstructions.instructions.md"
    "docker.instructions.md"
    "firestore.instructions.md"
    "functions.instructions.md"
    "next.instructions.md"
    "react.instructions.md"
    "shell.instructions.md"
    "testing.instructions.md"
    "tests.instructions.md"
    "typescript.instructions.md"
    "workflows.instructions.md"
)

for file in "${expected_instructions[@]}"; do
    check "Instruction file: ${file}" \
        "[[ -f '${GITHUB_DIR}/instructions/${file}' ]]"
done

echo ""
echo "🔍 Validating Frontmatter"
echo "-------------------------"

# Check frontmatter in instruction files
for file in "${GITHUB_DIR}"/instructions/*.instructions.md; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        
        # Check for frontmatter markers
        if head -n 1 "$file" | grep -q "^---$"; then
            if sed -n '2,10p' "$file" | grep -q "applyTo:"; then
                echo -e "${GREEN}✅${NC} ${filename}: Valid frontmatter"
                ((checks_passed++))
            else
                echo -e "${RED}❌${NC} ${filename}: Missing applyTo in frontmatter"
                ((checks_failed++))
            fi
        else
            echo -e "${RED}❌${NC} ${filename}: Missing frontmatter"
            ((checks_failed++))
        fi
    fi
done

echo ""
echo "⚙️  Validating Setup Steps"
echo "-------------------------"

if [[ -f "${GITHUB_DIR}/copilot-setup-steps.yml" ]]; then
    # Basic YAML validation
    if command -v yq &> /dev/null; then
        if yq eval '.' "${GITHUB_DIR}/copilot-setup-steps.yml" > /dev/null 2>&1; then
            check "Setup steps YAML is valid" "true"
            
            # Check for required sections
            if yq eval '.setup' "${GITHUB_DIR}/copilot-setup-steps.yml" > /dev/null 2>&1; then
                check "Setup section exists" "true"
            else
                check "Setup section exists" "false"
            fi
        else
            check "Setup steps YAML is valid" "false"
        fi
    else
        warn "yq not installed - skipping YAML validation"
    fi
    
    # Check for common setup commands
    if grep -q "pnpm install" "${GITHUB_DIR}/copilot-setup-steps.yml"; then
        check "Setup includes pnpm install" "true"
    else
        warn "Setup may be missing pnpm install"
    fi
fi

echo ""
echo "🔧 Validating DeepSource Config"
echo "-------------------------------"

if [[ -f "${PROJECT_ROOT}/.deepsource.toml" ]]; then
    # Check for key sections
    if grep -q "\[\[analyzers\]\]" "${PROJECT_ROOT}/.deepsource.toml"; then
        check "DeepSource has analyzers defined" "true"
    else
        check "DeepSource has analyzers defined" "false"
    fi
    
    # Check for specific analyzers
    if grep -q 'name = "javascript"' "${PROJECT_ROOT}/.deepsource.toml"; then
        check "JavaScript/TypeScript analyzer enabled" "true"
    else
        check "JavaScript/TypeScript analyzer enabled" "false"
    fi
    
    if grep -q 'name = "docker"' "${PROJECT_ROOT}/.deepsource.toml"; then
        check "Docker analyzer enabled" "true"
    else
        warn "Docker analyzer not enabled"
    fi
    
    if grep -q 'name = "secrets"' "${PROJECT_ROOT}/.deepsource.toml"; then
        check "Secrets scanner enabled" "true"
    else
        warn "Secrets scanner not enabled"
    fi
    
    # Check for Prettier transformer
    if grep -q 'name = "prettier"' "${PROJECT_ROOT}/.deepsource.toml"; then
        check "Prettier transformer enabled" "true"
    else
        warn "Prettier transformer not enabled"
    fi
fi

echo ""
echo "📦 Checking Dependencies"
echo "-----------------------"

cd "${PROJECT_ROOT}"

# Check if required tools are available in package.json
if [[ -f "package.json" ]]; then
    if grep -q '"firebase-tools"' package.json; then
        check "Firebase tools in dependencies" "true"
    else
        warn "Firebase tools not in dependencies"
    fi
    
    if grep -q '"@playwright/test"' package.json; then
        check "Playwright in dependencies" "true"
    else
        warn "Playwright not in dependencies"
    fi
    
    if grep -q '"vitest"' package.json; then
        check "Vitest in dependencies" "true"
    else
        check "Vitest in dependencies" "false"
    fi
fi

echo ""
echo "📊 Summary"
echo "=========="
echo -e "${GREEN}Passed:${NC}  ${checks_passed}"
echo -e "${RED}Failed:${NC}  ${checks_failed}"
echo -e "${YELLOW}Warnings:${NC} ${warnings}"
echo ""

if [[ ${checks_failed} -eq 0 ]]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed${NC}"
    exit 1
fi
