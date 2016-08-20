#!/usr/bin/env bash

flag=$1

function _runmocha() {
  mocha $2 $__node_harmony $(find $1/test -name '*-test.js') --timeout 60000;
}

if [ "$flag" == '--watch' ]; then
    _runmocha '*' '--watch'
elif [ "$flag" == '--cli' ]; then
    _runmocha 'lighthouse-cli'
else
    _runmocha 'lighthouse-cli' && _runmocha 'lighthouse-core'
fi
