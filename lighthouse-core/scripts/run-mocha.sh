#!/usr/bin/env bash

##
# @license Copyright 2017 Google Inc. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

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
elif [ "$flag" == '--launcher' ]; then
  cd chrome-launcher && yarn test -- --timeout 60000 --reporter dot
else
  echo "lighthouse-core tests" && _runmocha 'lighthouse-core' && \
  echo "lighthouse-cli tests" && _runmocha 'lighthouse-cli' && \
  echo "lighthouse-viewer tests" && _runmocha 'lighthouse-viewer' && \
  echo "chrome-launcher tests" && cd chrome-launcher && yarn test -- --timeout 60000 --reporter dot
fi
