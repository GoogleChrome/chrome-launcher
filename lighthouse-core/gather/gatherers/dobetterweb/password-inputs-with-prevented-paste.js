/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global document ClipboardEvent */

const Gatherer = require('../gatherer');

// This is run in the page, not Lighthouse itself.
/* istanbul ignore next */
function findPasswordInputsWithPreventedPaste() {
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

  return Array.from(document.querySelectorAll('input[type="password"]'))
    .filter(passwordInput =>
      !passwordInput.dispatchEvent(
        new ClipboardEvent('paste', {cancelable: true})
      )
    )
    .map(passwordInput => ({
      snippet: getOuterHTMLSnippet(passwordInput)
    }));
}

class PasswordInputsWithPreventedPaste extends Gatherer {
  /**
   * @param {!Object} options
   * @return {!Promise<!Array<{name: string, id: string}>>}
   */
  afterPass(options) {
    const driver = options.driver;
    return driver.evaluateAsync(
      `(${findPasswordInputsWithPreventedPaste.toString()}())`
    );
  }
}


module.exports = PasswordInputsWithPreventedPaste;
