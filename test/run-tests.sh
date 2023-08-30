#!/usr/bin/env bash
 
set -euxo pipefail

export TS_NODE_PROJECT="test/tsconfig.json"
DEBUG="*" mocha --loader=ts-node/esm --reporter=spec --timeout=10000 test/chrome-launcher-test.ts
