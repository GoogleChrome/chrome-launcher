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

/**
 * Creates an output string to tell the user why their audit failed
 *
 * @param {{nodes: !Array, help: string}} rule An aXe test rule with a list of failing nodes
 *    and help text on how to fix the violation.
 * @return {string} A debug string telling the user why their test failed and which nodes
 *    caused the failure.
 */
function createDebugString(rule) {
  if (typeof rule === 'undefined') {
    return '';
  }

  const elementsStr = rule.nodes.length === 1 ? 'element' : 'elements';
  return `${rule.help} (Failed on ${rule.nodes.length} ${elementsStr})`;
}

module.exports = {
  createDebugString
};
