#!/usr/bin/env bash
# Renders the PNG icons and social image from the SVG/HTML sources with headless Chromium.
# Run after editing the art; the outputs in public/ are committed.
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME=${CHROME:-$(command -v chromium || command -v chromium-browser || command -v google-chrome)}
shot() { # src width height out
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --window-size="$2,$3" --screenshot="$PWD/$4" "file://$PWD/$1" 2>/dev/null
}
shot scripts/icon.html 512 512 public/icon-512.png
shot scripts/icon.html 192 192 public/icon-192.png
shot scripts/icon.html 180 180 public/apple-touch-icon.png
shot scripts/og.html 1200 630 public/og-image.png
ls -l public/*.png
