#!/usr/bin/env bash
HERE="$(cd "$(dirname "$0")" && pwd)"
exec "$HERE/../shared/ship/judge-impl.sh" "$HERE/TASK.md" "$@"
