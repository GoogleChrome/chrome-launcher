#!/usr/bin/env bash
 
set -euxo pipefail

has_files=false
for arg in "$@"; do
  if [[ "$arg" != -* ]]; then
    has_files=true
    break
  fi
done
if [ "$has_files" = false ]; then
  set -- test/**/*-test.ts "$@"
fi

node --import ./test/loader.mjs ./node_modules/.bin/mocha --reporter=dot --timeout=10000 "$@"
