/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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
    pre: `${objectName}.addEventListener('${listener.type}', ${handler})`
  }, listener);
}

/**
 * Groups event listeners under url/line/col "violation buckets".
 *
 * The listener gatherer returns a list of (url/line/col) src locations where
 * event handlers were attached to DOM nodes. This location is where
 * addEventListener was invoked, but it's not guaranteed to be where
 * the user's event handler was defined. An example is libraries, where the
 * user provides a callback and the library calls addEventListener (another
 * part of the codebase). Instead we map url/line/col/type to array of event
 * handlers so the user doesn't see a redundant list of url/line/col from the
 * same location.
 *
 * @param {!Array<!Object>} listeners Results from the event listener gatherer.
 * @return {!Array<{line: number, col: number, url: string, type: string, pre: string, label: string}>}
 *     A list of slimmed down listener objects.
 */
function groupCodeSnippetsByLocation(listeners) {
  const locToListenersMap = new Map();
  listeners.forEach(loc => {
    const key = JSON.stringify({line: loc.line, col: loc.col, url: loc.url, type: loc.type});
    if (locToListenersMap.has(key)) {
      locToListenersMap.get(key).push(loc);
    } else {
      locToListenersMap.set(key, [loc]);
    }
  });

  const results = [];
  locToListenersMap.forEach((listenersForLocation, key) => {
    const lineColUrlObj = JSON.parse(key);
    // Aggregate the code snippets.
    const codeSnippets = listenersForLocation.reduce((prev, loc) => {
      return prev + loc.pre.trim() + '\n\n';
    }, '');
    lineColUrlObj.pre = codeSnippets;
    // All listeners under this bucket have the same line/col. We use the first's
    // label as the label for all of them.
    lineColUrlObj.label = listenersForLocation[0].label;
    results.push(lineColUrlObj);
  });

  return results;
}

module.exports = {
  addFormattedCodeSnippet,
  groupCodeSnippetsByLocation
};
