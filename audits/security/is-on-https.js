/**
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

const Audit = require('../audit');

class HTTPS extends Audit {

  static get tags() {
    return ['Security'];
  }

  static get name() {
    return 'is-on-https';
  }

  static get description() {
    return 'Site is on HTTPS';
  }

  static audit(inputs) {
    return HTTPS.buildOutput(!!inputs.https);
  }
}

module.exports = HTTPS;
