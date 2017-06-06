/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global window, document, Node */

const Gatherer = require('./gatherer');
const fs = require('fs');
const axeLibSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

// This is run in the page, not Lighthouse itself.
// axe.run returns a promise which fulfills with a results object
// containing any violations.
/* istanbul ignore next */
function runA11yChecks() {
  return window.axe.run(document, {
    elementRef: true,
    runOnly: {
      type: 'tag',
      values: [
        'wcag2a',
        'wcag2aa'
      ]
    },
    rules: {
      'tabindex': {enabled: true},
      'table-fake-caption': {enabled: true},
      'td-has-header': {enabled: true},
      'area-alt': {enabled: false},
      'blink': {enabled: false},
      'server-side-image-map': {enabled: false}
    }
  }).then(axeResult => {
    // Augment the node objects with outerHTML snippet & custom path string
    axeResult.violations.forEach(v => v.nodes.forEach(node => {
      node.path = getNodePath(node.element);
      node.snippet = getOuterHTMLSnippet(node.element);
      // avoid circular JSON concerns
      node.element = node.any = node.all = node.none = undefined;
    }));

    // We only need violations, and circular references are possible outside of violations
    axeResult = {violations: axeResult.violations};
    return axeResult;
  });

  // Adapted from DevTools' SDK.DOMNode.prototype.path
  //   https://github.com/ChromeDevTools/devtools-frontend/blob/7a2e162ddefd/front_end/sdk/DOMModel.js#L530-L552
  // TODO: Doesn't handle frames or shadow roots...
  function getNodePath(node) {
    function getNodeIndex(node) {
      let index = 0;
      while (node = node.previousSibling) {
        // skip empty text nodes
        if (node.nodeType === Node.TEXT_NODE &&
          node.textContent.trim().length === 0) continue;
        index++;
      }
      return index;
    }

    const path = [];
    while (node && node.parentNode) {
      const index = getNodeIndex(node);
      path.push([index, node.nodeName]);
      node = node.parentNode;
    }
    path.reverse();
    return path.join(',');
  }

  /**
   * Gets the opening tag text of the given node.
   * @param {!Node}
   * @return {string}
   */
  function getOuterHTMLSnippet(node) {
    const reOpeningTag = /^.*?\>/;
    const match = node.outerHTML.match(reOpeningTag);
    return match && match[0];
  }
}

class Accessibility extends Gatherer {
  /**
   * @param {!Object} options
   * @return {!Promise<{violations: !Array}>}
   */
  afterPass(options) {
    const driver = options.driver;
    const expression = `(function () {
      ${axeLibSource};
      return (${runA11yChecks.toString()}());
    })()`;

    return driver.evaluateAsync(expression).then(returnedValue => {
      if (!returnedValue) {
        throw new Error('No axe-core results returned');
      }
      if (!Array.isArray(returnedValue.violations)) {
        throw new Error('Unable to parse axe results' + returnedValue);
      }
      return returnedValue;
    });
  }
}

module.exports = Accessibility;
