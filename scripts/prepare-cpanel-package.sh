#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-$ROOT/../c7-store-catalogo-cpanel}"
ARCHIVE="${2:-$ROOT/../c7-store-catalogo-cpanel.tar.gz}"

cd "$ROOT"
pnpm check
pnpm test
pnpm build

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.manus-logs' \
  --exclude='.manus' \
  --exclude='.project-config.json' \
  --exclude='client/public/__manus__' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='coverage' \
  --exclude='tmp' \
  ./ "$OUT_DIR/"

cp -R dist "$OUT_DIR/dist"
cp deploy/cpanel/production-env.template "$OUT_DIR/production-env.template"

rm -f "$ARCHIVE"
tar -C "$(dirname "$OUT_DIR")" -czf "$ARCHIVE" "$(basename "$OUT_DIR")"

printf 'Pacote criado: %s\n' "$ARCHIVE"
printf 'Pasta preparada: %s\n' "$OUT_DIR"
