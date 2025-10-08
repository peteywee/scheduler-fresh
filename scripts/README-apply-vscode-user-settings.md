Apply workspace VS Code settings to your user settings (safe script)

This small Node script helps you copy/merge the workspace `.vscode/settings.json` into your VS Code _user_ settings file (for example, `$HOME/.config/Code/User/settings.json`). It makes a timestamped backup of any existing file before writing.

Files

- `apply-vscode-user-settings.js` — script that performs a merge and backup.

Usage

From the repository root run (dry-run preview only):

```bash
node ./scripts/apply-vscode-user-settings.js --dry-run
```

To actually write the merged settings:

```bash
node ./scripts/apply-vscode-user-settings.js
```

Options

- `--dry-run` or `-n`: show the merged settings and exit without changing any files.
- `--target <path>` or `-t <path>`: specify an alternate user settings path.

Notes

- The script cannot modify your user settings from inside the repository without you running it — this is intentional and safer.
- A backup like `settings.json.bak.2025-10-07T12-00-00-000Z` will be created if a settings file already exists.
