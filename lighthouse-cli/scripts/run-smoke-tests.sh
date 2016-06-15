#!/usr/bin/env bash

cd lighthouse-cli/test/fixtures && python -m SimpleHTTPServer 9999 &

./lighthouse-cli/index.js http://localhost:9999/online-only.html > results

if ! grep -q "URL responds with a 200 when offline: false" results; then
  echo "Fail! online only site worked while offline"
  cat results
  exit 1
fi

sleep 5s

./lighthouse-cli/index.js https://www.moji-brush.com > results

if ! grep -q "URL responds with a 200 when offline: true" results; then
  echo "Fail! offline ready site did not work while offline"
  cat results
  exit 1
fi
