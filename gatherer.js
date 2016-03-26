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

class Gatherer {

  static gather(gatherers, options) {
    const driver = options.driver;
    const artifacts = [];

    // Execute gatherers sequentially and return results array when complete.
    return gatherers.reduce((chain, gatherer) => {
      return chain
        .then(_ => gatherer.gather(options))
        .then(artifact => artifacts.push(artifact));
    }, driver.connect())
      .then(_ => driver.disconnect())
      .then(_ => artifacts);
  }

}

module.exports = Gatherer;
