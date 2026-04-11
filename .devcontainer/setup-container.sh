#!/usr/bin/env bash
set -euo pipefail

# Runs on every container start (postStartCommand). Idempotent — safe to re-run.

# --- GitHub CLI + git credential helper ---
# gh auth login enables `gh` CLI commands (gh pr, gh issue, etc.)
# gh auth setup-git registers credential helper for HTTPS git operations (push, pull, fetch)
if [ -n "${GITHUB_TOKEN:-}" ]; then
  if gh auth status >/dev/null 2>&1; then
    echo "[setup-container] gh CLI already authenticated."
  else
    echo "$GITHUB_TOKEN" | gh auth login --with-token
    gh auth setup-git
    echo "[setup-container] gh CLI authenticated + git credential helper configured."
  fi
else
  echo "[setup-container] No GITHUB_TOKEN — gh CLI not authenticated."
  echo "[setup-container] Run 'gh auth login' manually for gh commands and HTTPS git operations."
fi

# --- Claude Code auth note ---
# Host folder mounts are intentionally absent. On first container creation,
# Claude Code has no credentials. The user must run `claude login` interactively
# inside the container once; credentials persist in the claude-config volume
# across container restarts and rebuilds (until the volume itself is removed).
if [ ! -s "$HOME/.claude/.credentials.json" ]; then
  echo "[setup-container] Claude Code not authenticated — run 'claude login' in the container terminal."
fi
