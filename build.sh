#!/bin/sh
# Assemble index.html: shell + inlined style + classic scripts (game, gi, ui).
# hex-board.js loads separately as an ES module (referenced inside shell.html),
# with export/tiles3d.js + export/pieces3d.js as its siblings, and three.js from unpkg.
cd "$(dirname "$0")"
{
  cat shell.html
  echo '<style>';  cat style.css; echo '</style>'
  echo '<script>'; cat game.js;   echo '</script>'
  echo '<script>'; cat gi.js;     echo '</script>'
  echo '<script>'; cat ui.js;     echo '</script>'
} > index.html
cp index.html hexhaven.html
echo "built index.html ($(wc -c < index.html) bytes)"
