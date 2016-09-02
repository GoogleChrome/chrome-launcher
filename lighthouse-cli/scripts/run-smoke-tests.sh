#!/usr/bin/env bash

node lighthouse-cli/test/fixtures/static-server.js &

sleep 0.5s

NODE=$([ $(node -v | grep -E "v4") ] && echo "node --harmony" || echo "node")
config="$PWD/lighthouse-cli/test/fixtures/smoketest-offline-config.json"

offline200result="URL responds with a 200 when offline"

function killBGprocesses() {
  kill $(jobs -p)
}

# run default lighthouse run against a boring basic page
$NODE lighthouse-cli --quiet http://localhost:10200/online-only.html > results

# test that we have results
if ! grep -q "$offline200result" results; then
  echo "Fail! Lighthouse run didn't create a result file"
  killBGprocesses; exit 1
fi

# test that we have a meta viewport defined on a static page
if ! grep -q "HTML has a viewport <meta>: true" results; then
  echo "Fail! Meta viewort not detected in the page"
  killBGprocesses; exit 1
fi

# test a static page which should fail the offline test
if ! grep -q "$offline200result: false" results; then
  echo "Fail! online only site worked while offline"
  cat results
  killBGprocesses; exit 1
fi

sleep 0.5s

# run minimal lighthouse run against a basic offline-sw page
$NODE lighthouse-cli --config-path=$config --quiet http://localhost:10503/offline-ready.html > results

if ! grep -q "$offline200result: true" results; then
  echo "Fail! offline ready site did not work while offline"
  cat results
  killBGprocesses; exit 1
fi

killBGprocesses
