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

class Gather {

  constructor() {
    this.artifact = {};
  }

  /**
   * @return {string}
   */
  get name() {
    return this.constructor.name;
  }

  /* eslint-disable no-unused-vars */

  setup(options) { }

  beforePass(options) { }

  pass(options) { }

  afterPass(options) { }

  tearDown(options) { }

  /* eslint-enable no-unused-vars */

}

module.exports = Gather;
