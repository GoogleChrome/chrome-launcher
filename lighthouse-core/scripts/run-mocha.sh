#!/usr/bin/env bash

flag=$1

function _runmocha() {
  mocha --reporter dot $2 $(find $1/test -name '*-test.js') --timeout 60000;
}

if [ "$flag" == '--watch' ]; then
  _runmocha '*' '--watch'
elif [ "$flag" == '--cli' ]; then
  _runmocha 'lighthouse-cli'
elif [ "$flag" == '--viewer' ]; then
  _runmocha 'lighthouse-viewer'
elif [ "$flag" == '--core' ]; then
  _runmocha 'lighthouse-core'
else
  echo "lighthouse-core tests" && _runmocha 'lighthouse-core' && \
  echo "lighthouse-cli tests" && _runmocha 'lighthouse-cli' && \
 echo "lighthouse-viewer tests" && _runmocha 'lighthouse-viewer'
fi
