#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [ "$#" -ne 2 ]; then
  printf 'Usage: bash %s MODEL_DIRECTORY RECEIPT_JSON
' "$0" >&2
  exit 2
fi
# Downloads the actual 22 GB model from the canonical GitHub Release, not HF.
# No dependency installation, service launch, credentials or public ports.
exec python3 "$HERE/runtime/download_from_github.py" --model-dir "$1" --receipt "$2"
