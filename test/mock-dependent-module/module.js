/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';


const ChromeLauncher = require('chrome-launcher');

/**
 * Attempts to connect to an instance of Chrome with an open remote-debugging
 * port. If none is found, launches a debuggable instance.
 * @return {!Array<string>}
 */
function getKeysOfLauncher() {
  const l = new ChromeLauncher.Launcher();
  console.log(Object.keys(l));
  return Object.keys(l);
}


getKeysOfLauncher();

module.exports = {
  // getDebuggableChrome,
  getKeysOfLauncher,
};
