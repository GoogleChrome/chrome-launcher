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
 * Adds line/col information to an event listener object along with a formatted
 * code snippet of violation.
 *
 * @param {!Object} listener A modified EventListener object as returned
 *     by the driver in the all events gatherer.
 * @return {!Object} A copy of the original listener object with the added
 *     properties.
 */
function addFormattedCodeSnippet(listener) {
  const handler = listener.handler ? listener.handler.description : '...';
  const objectName = listener.objectName.toLowerCase().replace('#document', 'document');
  return Object.assign({
    label: `line: ${listener.line}, col: ${listener.col}`,
    code: `${objectName}.addEventListener('${listener.type}', ${handler})`
  }, listener);
}

module.exports = {
  addFormattedCodeSnippet
};
