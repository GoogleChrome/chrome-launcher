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

/**
 * @fileoverview Tests whether the page is using console.time().
 */

'use strict';

const Gatherer = require('../gatherer');

class ConsoleTimeUsage extends Gatherer {

  beforePass(options) {
    this.collectUsage = options.driver.captureFunctionCallSites('console.time');
  }

  afterPass() {
    return this.collectUsage().then(consoleTimeUsage => {
      this.artifact.usage = consoleTimeUsage;
    }, e => {
      this.artifact = {
        value: -1,
        debugString: e.message
      };
      return;
    });
  }
}

module.exports = ConsoleTimeUsage;
