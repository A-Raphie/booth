#!/bin/bash
# Booth showcase audio: VO beats + live director cut + synthesized ambient bed,
# sidechain-ducked, normalized. Output: renders/master-audio.m4a (73.0s)
set -e
cd "$(dirname "$0")/.."
TOTAL=73.0

# 1. director cut: take the final 6.0s of the live capture (the retake line,
#    after the greeting), tight fade edges
ffmpeg -y -v error -i media/director-live.wav -af "atrim=7.4:13.4,asetpts=PTS-STARTPTS,afade=t=in:d=0.15,afade=t=out:st=5.6:d=0.4" renders/director-cut.wav

# 2. ambient bed: warm A-major drone, slow LFO, lowpassed, 73s
ffmpeg -y -v error -f lavfi -i "aevalsrc=0.16*sin(2*PI*110*t)+0.12*sin(2*PI*164.81*t)+0.10*sin(2*PI*220*t)+0.05*sin(2*PI*277.18*t):s=44100" \
  -af "tremolo=f=0.13:d=0.55,lowpass=f=900,afade=t=in:d=2.5,afade=t=out:st=69:d=4,volume=0.9" \
  -t $TOTAL renders/bgm.wav

# 3. VO beats at scene starts + 0.4s lead-in
#    S1 0.4 | S2 13.4 | S3 33.4 | S4 51.4 | S5 63.4   (scenes: 13/20/18/12/10)
ffmpeg -y -v error \
  -i audio/beat-1.mp3 -i audio/beat-2.mp3 -i audio/beat-3.mp3 -i audio/beat-4.mp3 -i audio/beat-5.mp3 -i renders/director-cut.wav \
  -filter_complex "\
[0:a]adelay=400|400[a0];\
[1:a]adelay=13400|13400[a1];\
[2:a]adelay=33400|33400[a2];\
[3:a]adelay=51400|51400[a3];\
[4:a]adelay=63400|63400[a4];\
[5:a]adelay=46000|46000,volume=1.35[a5];\
[a0][a1][a2][a3][a4][a5]amix=inputs=6:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=10,apad=whole_dur=73[vo]" \
  -map "[vo]" -t $TOTAL renders/vo-full.wav

# 4. duck the bed under the VO+director track
ffmpeg -y -v error -i renders/vo-full.wav -i renders/bgm.wav \
  -filter_complex "\
[1:a]volume=0.16[bgm];\
[bgm][0:a]sidechaincompress=threshold=0.03:ratio=5:attack=40:release=400[duck];\
[0:a][duck]amix=inputs=2:duration=first:normalize=0[out]" \
  -map "[out]" -b:a 192k -t $TOTAL renders/master-audio.m4a

echo "master audio:"
ffprobe -v error -show_entries format=duration -of csv=p=0 renders/master-audio.m4a
