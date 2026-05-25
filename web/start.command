#!/bin/bash
# Unique Properties — double-click this file (macOS) to start the local server.
# It opens the site in your browser and keeps running until you close the window.
cd "$(dirname "$0")" || exit 1

PORT="${PORT:-8080}"
URL="http://localhost:$PORT"

echo "Starting Unique Properties server on $URL ..."
echo "Admin panel: $URL/admin.html"
echo "Press Ctrl+C (or close this window) to stop."
echo

# Open the browser shortly after the server boots.
( sleep 1; open "$URL" ) >/dev/null 2>&1 &

PORT="$PORT" python3 server.py
