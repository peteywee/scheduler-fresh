---
applyTo: "**/*.spec.ts"
---

# Testing Guidelines (Playwright & Jest)

1. Prefer `getByRole`, `getByText`, `getByTestId` instead of raw selectors.
2. Each test must be **independent**; use `beforeEach/afterEach` for setup/cleanup.
3. File names: `*.spec.ts` for unit/e2e tests.
4. Assertions: Use `expect()` with explicit matchers (`toBeVisible`, `toHaveText`).
5. Configure cross-browser testing (Chromium, Firefox, WebKit).
6. CI/CD: Headless, screenshots on failure, parallel execution.
