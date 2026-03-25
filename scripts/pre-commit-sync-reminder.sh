#!/bin/sh
# Pre-commit hook: remind to run `bun sync-cms` when Core module route files change.
# Install: cp scripts/pre-commit-sync-reminder.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

CHANGED_ROUTES=$(git diff --cached --name-only -- 'packages/core/modules/**/page.tsx' 'packages/core/modules/**/layout.tsx' 'packages/core/modules/**/loading.tsx')

if [ -n "$CHANGED_ROUTES" ]; then
  echo ""
  echo "=========================================="
  echo "  [sync-cms] Core route files changed:"
  echo "$CHANGED_ROUTES" | sed 's/^/    /'
  echo ""
  echo "  Run: bun sync-cms"
  echo "=========================================="
  echo ""
fi
