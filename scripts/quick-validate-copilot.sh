#!/usr/bin/env bash
# Quick validation of Copilot configuration

echo "🔍 Validating Copilot Configuration..."
echo ""

errors=0

# Check critical files exist
files=(
  ".github/copilot-instructions.md"
  ".github/copilot-setup-steps.yml"
  ".github/COPILOT_GUIDE.md"
  ".github/COPILOT_SETUP_SUMMARY.md"
  ".deepsource.toml"
)

for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    echo "✅ $file"
  else
    echo "❌ $file - MISSING"
    ((errors++))
  fi
done

echo ""
echo "📝 Instruction Files:"

# Check instruction files
instruction_count=$(find .github/instructions -name "*.instructions.md" 2>/dev/null | wc -l)
echo "   Found ${instruction_count} instruction files"

if [[ $instruction_count -ge 10 ]]; then
  echo "   ✅ Sufficient instruction coverage"
else
  echo "   ⚠️  May need more instruction files"
fi

echo ""

if [[ $errors -eq 0 ]]; then
  echo "✅ Configuration is valid!"
  exit 0
else
  echo "❌ Configuration has ${errors} errors"
  exit 1
fi
