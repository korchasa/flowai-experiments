#!/usr/bin/env bash
HERE="$(cd "$(dirname "$0")" && pwd)"
exec "$HERE/../shared/ship/run-impl.sh" "$HERE/TASK.md" "$@"
