#!/usr/bin/env bash
 
set -euxo pipefail

export TS_NODE_PROJECT="test/tsconfig.json"
mocha --loader=ts-node/esm --reporter=dot test/**/*-test.ts --timeout=10000
