#!/bin/bash
# Booth showcase assembly v2: CFR 30 normalization + concat
set -e
cd "$(dirname "$0")/.."
mkdir -p renders

SC="scale=1976:1002:flags=lanczos,crop=1920:1002,fps=30"

ffmpeg -y -v error -i media/scene-1-hook.mp4 -i overlays/chrome-root.png -i overlays/hud-1.png \
  -filter_complex "[0:v]trim=0:13,setpts=PTS-STARTPTS,${SC}[body];[body]pad=1920:1080:0:78[bg];[bg][1]overlay=0:0[v1];[v1][2]overlay=0:0" \
  -an -c:v libx264 -crf 12 -preset medium -pix_fmt yuv420p -r 30 renders/s1.mp4

ffmpeg -y -v error -i media/scene-2-proof.mp4 -i overlays/chrome-root.png -i overlays/hud-2.png \
  -filter_complex "[0:v]trim=3.5:23.5,setpts=PTS-STARTPTS,${SC}[body];[body]pad=1920:1080:0:78[bg];[bg][1]overlay=0:0[v1];[v1][2]overlay=0:0" \
  -an -c:v libx264 -crf 12 -preset medium -pix_fmt yuv420p -r 30 renders/s2.mp4

ffmpeg -y -v error -loop 1 -i overlays/terminal-scene.png -t 18 \
  -filter_complex "[0:v]scale=1920:1080,fps=30" \
  -an -c:v libx264 -crf 12 -preset medium -pix_fmt yuv420p -r 30 renders/s3.mp4

ffmpeg -y -v error -i media/scene-4-booth.mp4 -i overlays/chrome-booth.png -i overlays/hud-4.png \
  -filter_complex "[0:v]setpts=PTS*1.0791,trim=0:12,setpts=PTS-STARTPTS,${SC}[body];[body]pad=1920:1080:0:78[bg];[bg][1]overlay=0:0[v1];[v1][2]overlay=0:0" \
  -an -c:v libx264 -crf 12 -preset medium -pix_fmt yuv420p -r 30 renders/s4.mp4

ffmpeg -y -v error -loop 1 -i overlays/outro.png -t 10 \
  -filter_complex "[0:v]scale=1920:1080,fps=30" \
  -an -c:v libx264 -crf 12 -preset medium -pix_fmt yuv420p -r 30 renders/s5.mp4

printf "file 's1.mp4'\nfile 's2.mp4'\nfile 's3.mp4'\nfile 's4.mp4'\nfile 's5.mp4'\n" > renders/list.txt
ffmpeg -y -v error -f concat -safe 0 -i renders/list.txt -c:v libx264 -crf 12 -preset medium -pix_fmt yuv420p -r 30 renders/video-track.mp4
echo "video track:"
ffprobe -v error -show_entries format=duration -of csv=p=0 renders/video-track.mp4
