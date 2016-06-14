/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const Gather = require('./gather');

class HTML extends Gather {

  afterPass(options) {
    const driver = options.driver;

    return driver.sendCommand('DOM.getDocument')
        .then(result => result.root.nodeId)
        .then(nodeId => driver.sendCommand('DOM.getOuterHTML', {
          nodeId: nodeId
        }))
        .then(nodeHTML => {
          this.artifact = nodeHTML.outerHTML;
        }).catch(_ => {
          this.artifact = {
            value: -1,
            debugString: 'Unable to get document HTML'
          };
        });
  }
}

module.exports = HTML;
