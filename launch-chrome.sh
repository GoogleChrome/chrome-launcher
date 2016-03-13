#!/usr/bin/env bash

/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary  \
  --remote-debugging-port=9222 \
  --no-first-run \
  --enable-gpu-benchmarking \
  --user-data-dir="/tmp/lighthouse-profile" \
  "about:blank"

