#!/usr/bin/env bash
# Scans public/img/ for image files and generates the image list JS file.
# Preserves existing entries (with author info). New images get DEFAULT_AUTHOR.
# Auto-converts PNG/JPG to WebP for optimization.
# Run this after adding/removing images: ./generate-images.sh

set -euo pipefail

DIR="public/img"
OUT="$DIR/images.js"
DEFAULT_AUTHOR="@jovannmc"
IMAGE_EXTENSIONS="webp png jpg jpeg gif bmp"
TMPFILE="$(mktemp)"

# Auto-convert PNGs and JPGs to WebP
for f in "$DIR"/*.png "$DIR"/*.jpg "$DIR"/*.jpeg; do
    [ -f "$f" ] || continue
    name="${f%.*}"
    if [ ! -f "${name}.webp" ]; then
        cwebp -q 85 "$f" -o "${name}.webp" 2>/dev/null && echo "  ⚡ Converted: $(basename "$f") -> $(basename "${name}.webp")"
        rm -f "$f"
    fi
done

# Collect existing entries from images.js (filename -> full line)
if [ -f "$OUT" ]; then
    while IFS= read -r line; do
        if echo "$line" | grep -qE "file:.*'[^']+'"; then
            fname=$(echo "$line" | sed "s/.*file: *'\\([^']*\\)'.*/\\1/")
            printf '%s\t%s\n' "$fname" "$line" >> "$TMPFILE"
        fi
    done < "$OUT"
fi

# Get file modification time as ISO string (macOS compatible)
get_mod_time() {
    stat -f '%Sm' -t '%Y-%m-%dT%H:%M:%S' "$1" 2>/dev/null || date -r "$1" '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || echo ""
}

# Build new file
echo "const MEMORY_IMAGES = [" > "$OUT"

added=0
kept=0
for ext in $IMAGE_EXTENSIONS; do
    for f in "$DIR"/*.$ext; do
        [ -f "$f" ] || continue
        fname="$(basename "$f")"
        match=$(grep -F "$fname" "$TMPFILE" 2>/dev/null | head -1 || true)
        if [ -n "$match" ]; then
            # Update timestamp on existing entry if missing
            existing_line=$(echo "$match" | cut -f2-)
            if echo "$existing_line" | grep -qE "timestamp:"; then
                echo "$existing_line" >> "$OUT"
            else
                ts=$(get_mod_time "$f")
                updated=$(echo "$existing_line" | sed "s/},/,timestamp: '$ts' },/")
                echo "$updated" >> "$OUT"
            fi
            kept=$((kept + 1))
        else
            ts=$(get_mod_time "$f")
            echo "    { file: '$fname', author: '$DEFAULT_AUTHOR', timestamp: '$ts' }," >> "$OUT"
            echo "  + Added: $fname"
            added=$((added + 1))
        fi
    done
done
echo "];" >> "$OUT"

rm -f "$TMPFILE"
total=$((kept + added))
echo "Generated $OUT — $total image(s) ($kept kept, $added new)."
