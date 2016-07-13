#!/usr/bin/env bash

cd lighthouse-cli/test/fixtures && python -m SimpleHTTPServer 9999 &

NODE=$([ $(node -v | grep -E "v4") ] && echo "node --harmony" || echo "node")
config="$PWD/lighthouse-cli/test/fixtures/smoketest-config.json"
flags="--config-path=$config"

offline200result="URL responds with a 200 when offline"

$NODE lighthouse-cli $flags http://localhost:9999/online-only.html > results

# test that we have results
if ! grep -q "$offline200result" results; then
  echo "Fail! Lighthouse run didn't create a result file"
  exit 1
fi

# test that we have a meta viewport defined on a static page
if ! grep -q "HTML has a viewport <meta>: true" results; then
  echo "Fail! Meta viewort not detected in the page"
  exit 1
fi

# test a static page which should fail the offline test
if ! grep -q "$offline200result: false" results; then
  echo "Fail! online only site worked while offline"
  cat results
  exit 1
fi

sleep 1s

# test mojibrush which should pass the offline test
$NODE lighthouse-cli $flags https://www.moji-brush.com > results

if ! grep -q "$offline200result: true" results; then
  echo "Fail! offline ready site did not work while offline"
  cat results
  exit 1
fi
