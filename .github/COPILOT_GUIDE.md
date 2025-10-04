# Copilot Configuration Guide

This document provides a comprehensive overview of GitHub Copilot configuration for the Scheduler-Fresh project.

## 📋 Overview

The Copilot configuration consists of:

1. **Global Instructions** (`.github/copilot-instructions.md`) - Project-wide guidelines
2. **Path-Specific Instructions** (`.github/instructions/`) - Context-aware rules
3. **Setup Steps** (`.github/copilot-setup-steps.yml`) - Ephemeral environment setup
4. **Code Quality** (`.deepsource.toml`) - Automated analysis and formatting

## 📁 File Structure

```
.github/
├── copilot-instructions.md           # Global project instructions
├── copilot-setup-steps.yml          # Setup automation for Copilot agent
└── instructions/                     # Path-specific guidelines
    ├── api.instructions.md           # API routes & server actions
    ├── components.instructions.md    # React components
    ├── copilotinstructions.instructions.md  # Core principles
    ├── docker.instructions.md        # Docker & containerization
    ├── firestore.instructions.md     # Firestore rules & queries
    ├── functions.instructions.md     # Firebase Functions
    ├── next.instructions.md          # Next.js specific
    ├── react.instructions.md         # React patterns
    ├── shell.instructions.md         # Shell scripts
    ├── testing.instructions.md       # Testing strategy
    ├── tests.instructions.md         # Test file patterns
    ├── typescript.instructions.md    # TypeScript standards
    └── workflows.instructions.md     # GitHub Actions
```

## 🎯 How It Works

### Global Instructions

The `.github/copilot-instructions.md` file provides:

- Operating principles (never guess, security first, ESM only)
- Tech stack ground truth (Next.js 15, TypeScript 5, Firebase)
- Data model & security rules
- Development flow & commands
- Code standards (TypeScript, React, styling, forms)
- MCP-first retrieval protocol

### Path-Specific Instructions

Each `.instructions.md` file in `.github/instructions/` applies to specific file patterns:

```yaml
---
applyTo: "**/*.tsx"
description: "React component guidelines"
---
```

When Copilot works on a file matching the pattern, it automatically loads these context-specific rules.

### Setup Steps

The `.github/copilot-setup-steps.yml` file:

- Configures the ephemeral development environment
- Installs dependencies (pnpm, Firebase CLI, Playwright)
- Runs initial build, lint, and test commands
- Ensures Copilot agent has a working environment

### Code Quality Integration

The `.deepsource.toml` file:

- Configures automated code analysis
- Enables multiple analyzers (JavaScript/TypeScript, Docker, Shell, Secrets)
- Integrates Prettier for consistent formatting
- Defines ignore patterns and test locations

## 🛠️ Language & Tool Support

### Configured Languages

| Language/Tool | Analyzer   | Status         | Configuration              |
| ------------- | ---------- | -------------- | -------------------------- |
| TypeScript    | javascript | ✅ Enabled     | Strict mode, ES modules    |
| JavaScript    | javascript | ✅ Enabled     | ES2022 environment         |
| React/JSX     | javascript | ✅ Enabled     | Functional components only |
| Docker        | docker     | ✅ Enabled     | Multi-stage builds         |
| Shell         | shell      | ✅ Enabled     | Bash dialect               |
| Secrets       | secrets    | ✅ Enabled     | Gitleaks integration       |
| YAML          | -          | ⚠️ Linter only | Prettier formatting        |
| Markdown      | -          | ⚠️ Linter only | Documentation              |
| JSON          | -          | ⚠️ Linter only | Config files               |

### Transformers (Formatters)

- **Prettier**: Enabled for all supported file types
- Automatic formatting on commit (via Husky + lint-staged)

## 📝 Creating New Instructions

To add new path-specific instructions:

1. Create a new file in `.github/instructions/`
2. Add frontmatter with `applyTo` pattern:

```markdown
---
applyTo: "src/lib/**/*.ts"
description: "Utility library guidelines"
---

# Utility Library Guidelines

Your guidelines here...
```

3. Patterns support glob syntax:
   - `**/*.ts` - All TypeScript files
   - `src/app/api/**` - All files in API directory
   - `**/*.spec.ts` - All test spec files

## 🔧 Testing Copilot Configuration

### Verify Instructions Load

When working in VS Code with GitHub Copilot:

1. Open a file (e.g., `src/components/Button.tsx`)
2. Ask Copilot: "What are the coding guidelines for this file?"
3. It should reference both global and component-specific instructions

### Test Setup Steps

The setup steps run automatically for Copilot coding agent, but you can test locally:

```bash
# Run setup commands manually
corepack enable
corepack prepare pnpm@latest --activate
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm typecheck
pnpm test:run
```

### Validate DeepSource Config

```bash
# Check DeepSource configuration
cat .deepsource.toml

# Push to repository to trigger analysis
git add .deepsource.toml
git commit -m "chore: update DeepSource configuration"
git push
```

## 🎓 Best Practices

### Writing Instructions

1. **Be specific**: "Use `useForm` from react-hook-form" not "Use a form library"
2. **Show examples**: Include code snippets for clarity
3. **Explain why**: Don't just say what, explain the reasoning
4. **Keep updated**: Review and update as patterns evolve

### Organizing Instructions

1. **Global for principles**: Architecture, security, conventions
2. **Path-specific for details**: Framework APIs, file-specific patterns
3. **Avoid duplication**: Reference global instructions when possible
4. **Use hierarchy**: General → Specific

### Managing Scope

1. **One concern per file**: Don't mix React and API guidelines
2. **Clear file patterns**: Use specific `applyTo` patterns
3. **Appropriate detail**: Balance comprehensiveness with readability

## 🔍 Troubleshooting

### Copilot Not Following Instructions

1. **Check file path matches** `applyTo` pattern
2. **Ensure frontmatter is valid** YAML
3. **Verify file exists** in `.github/instructions/`
4. **Try being explicit**: Reference the instruction file in your prompt

### Setup Steps Failing

1. **Check logs** in Copilot agent output
2. **Verify dependencies** are correctly specified
3. **Test commands locally** to ensure they work
4. **Update version pins** if needed

### DeepSource Issues

1. **Check configuration syntax** with TOML validator
2. **Review ignored patterns** if files aren't analyzed
3. **Verify analyzer compatibility** with your code
4. **Check DeepSource dashboard** for detailed errors

## 📚 Additional Resources

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Copilot Instructions Reference](https://github.blog/2024-08-22-how-to-use-github-copilot-instructions/)
- [DeepSource Documentation](https://deepsource.io/docs/)
- [Project Architecture](../../docs/architecture.md)
- [Development Guide](../../docs/QUICKSTART.md)

## 🔄 Maintenance

### Regular Reviews

- **Monthly**: Review and update coding standards
- **Per sprint**: Update with new patterns or decisions
- **On issues**: Address when Copilot makes repeated mistakes

### Version Updates

When updating dependencies:

1. Update version references in instructions
2. Test new APIs and patterns
3. Update examples if breaking changes
4. Document migration notes

### Feedback Loop

1. **Track Copilot suggestions**: Note patterns that need reinforcement
2. **Review PRs**: Look for instruction violations
3. **Update proactively**: Don't wait for problems
4. **Team consensus**: Ensure instructions reflect team agreements

---

**Last Updated**: December 2024  
**Maintainers**: @peteywee  
**Questions**: Open an issue with label `copilot-config`
