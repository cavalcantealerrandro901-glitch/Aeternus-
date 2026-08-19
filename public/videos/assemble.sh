#!/data/data/com.termux/files/usr/bin/bash
# Junta as partes base64 e gera o MP4 do daily
set -e
cd "$(dirname "$0")"
if command -v base64 >/dev/null 2>&1; then
  cat p1.txt p2.txt p3.txt p4.txt | base64 -d > daily-reward.mp4
else
  cat p1.txt p2.txt p3.txt p4.txt | openssl base64 -d -A > daily-reward.mp4
fi
ls -la daily-reward.mp4
echo "OK: public/videos/daily-reward.mp4 pronto"
