#!/usr/bin/env bash
# Carimba versão em HTML/JS para bust de cache no GitHub Pages.
set -euo pipefail

ROOT="${1:-_site}"
V="${2:?version required}"

HTML="$ROOT/index.html"

sed -i "s|href=\"css/app.css[^\"]*\"|href=\"css/app.css?v=${V}\"|" "$HTML"
sed -i "s|src=\"js/boot-cache.js[^\"]*\"|src=\"js/boot-cache.js?v=${V}\"|" "$HTML"

find "$ROOT/js" -name '*.js' -type f | while read -r file; do
  sed -i "s/from '\\(\\.[./][^']*\\.js\\)'/from '\\1?v=${V}'/g" "$file"
  sed -i "s/from \"\\(\\.[./][^\"]*\\.js\\)\"/from \"\\1?v=${V}\"/g" "$file"
  sed -i "s/import('\\(\\.[./][^']*\\.js\\)')/import('\\1?v=${V}')/g" "$file"
  sed -i "s/\\.js?v=${V}?v=${V}/.js?v=${V}/g" "$file"
done

echo "Stamped version ${V} in ${ROOT}"
