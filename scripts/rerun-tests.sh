node -e "console.log(require('./package.json').packageManager)"
cat ~/.npmrc 2>/dev/null || true
cat ~/.pnpmrc 2>/dev/null || true
env | grep -i npm || true
