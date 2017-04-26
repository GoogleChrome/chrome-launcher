#!/usr/bin/env bash

node lighthouse-cli/test/fixtures/static-server.js &

sleep 0.5s

config="lighthouse-core/config/perf.json"
expectations="lighthouse-cli/test/smokehouse/perf/expectations.js"
save_assets=""

if [[ "$CI" = true ]]; then
  # save assets so that failures may be examined later
  save_assets="--save-assets-path=perf.json"
fi

yarn smokehouse -- --config-path=$config --expectations-path=$expectations "$save_assets"
exit_code=$?

# kill test servers
kill $(jobs -p)

exit "$exit_code"
