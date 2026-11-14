#!/usr/bin/env bash
# Welcome reel, owner request 13 Nov: play 50% slower (22.2 s -> 33.3 s) with the original score
# muxed in. Motion-interpolated back to 30 fps so the slower cut stays smooth; the score is
# time-stretched with pitch kept (120 -> 80 BPM), so every whoosh still lands on its cut.
# Usage: tools/reel/slow-with-music.sh <reel-22s.mp4> <out.mp4>
set -euo pipefail
IN=${1:?input reel}; OUT=${2:?output mp4}
TMP=$(mktemp -d)
python3 "$(dirname "$0")/music4.py" "$TMP/score.wav" 22.2
ffmpeg -v error -y -i "$IN" -i "$TMP/score.wav" -filter_complex \
  "[0:v]setpts=1.5*PTS,minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1[v];[1:a]atempo=0.6667,afade=t=out:st=31.8:d=1.5[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 22 -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "$OUT"
rm -rf "$TMP"
