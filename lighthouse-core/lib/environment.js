/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const semver = require('semver');
const vm = require('vm');

function checkNodeCompatibility() {
  // node 5.x required due to use of ES2015 features, like spread operator
  if (semver.gte(process.version, '5.0.0')) {
    return true;
  }

  try {
    // Test for the availability of the spread operator.
    new vm.Script('Math.max(...[ 5, 10 ])').runInThisContext();
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  checkNodeCompatibility: checkNodeCompatibility
};
