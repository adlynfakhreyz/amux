#!/usr/bin/env bash
# Record the scripted demo (tests/demo.js) and render docs/demo.gif + dist/lymux-demo.mp4.
# Frames have an alpha channel, so they are composited over a gradient to show the transparency.
set -euo pipefail
cd "$(dirname "$0")/.."
work=$(mktemp -d)
mkdir -p "$work/frames" dist docs
npx electron-vite build >/dev/null
LYMUX_USER_DATA="$work/profile" LYMUX_RECORD="$work/frames" LYMUX_EVAL=tests/demo.js LYMUX_EVAL_DELAY=1500 \
  ./node_modules/electron/dist/electron . --no-sandbox 2>/dev/null | grep -E 'EVAL_(RESULT|ERROR)' || true
n=$(ls "$work/frames"/*.png | wc -l)
echo "captured $n frames"
size=$(identify -format '%wx%h' "$work/frames/frame-00000.png")
bg="gradients=s=${size}:c0=0x2b3a6b:c1=0x6b2b5a:x0=0:y0=0:x1=${size%x*}:y1=${size#*x}:speed=0.00001"
# MP4 (release asset)
ffmpeg -y -loglevel error -f concat -safe 0 -i "$work/frames/frames.txt" -f lavfi -i "$bg" \
  -filter_complex "[1][0]overlay=shortest=1,crop=trunc(iw/2)*2:trunc(ih/2)*2,fps=25,format=yuv420p" \
  -c:v libx264 -crf 20 -movflags +faststart dist/lymux-demo.mp4
# GIF (README): smaller, palette-optimised
ffmpeg -y -loglevel error -i dist/lymux-demo.mp4 \
  -vf "fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" docs/demo.gif
ls -la dist/lymux-demo.mp4 docs/demo.gif
rm -rf "$work"
