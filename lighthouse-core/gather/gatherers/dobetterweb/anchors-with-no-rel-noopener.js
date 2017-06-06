/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('../gatherer');

class AnchorsWithNoRelNoopener extends Gatherer {
  /**
   * @param {!Object} options
   * @return {!Promise<!Array<{href: string, rel: string, target: string}>>}
   */
  afterPass(options) {
    const driver = options.driver;
    return driver.querySelectorAll('a[target="_blank"]:not([rel~="noopener"])')
      .then(failingNodeList => {
        const failingNodes = failingNodeList.map(node => {
          return Promise.all([
            node.getAttribute('href'),
            node.getAttribute('rel'),
            node.getAttribute('target')
          ]);
        });
        return Promise.all(failingNodes);
      })
      .then(failingNodes => {
        return failingNodes.map(node => {
          return {
            href: node[0],
            rel: node[1],
            target: node[2]
          };
        });
      });
  }
}

module.exports = AnchorsWithNoRelNoopener;
