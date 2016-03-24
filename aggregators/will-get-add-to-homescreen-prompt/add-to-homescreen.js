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

const Aggregate = require('../aggregate');

class AddToHomescreen extends Aggregate {

  static get name() {
    return 'Has valid Add to Homescreen Manifest';
  }

  static get criteria() {
    return {
      'manifest-exists': {
        value: true,
        weight: 1
      },
      'manifest-background-color': {
        value: true,
        weight: 1
      },
      'manifest-icons': {
        value: true,
        weight: 1
      },
      'manifest-icons-192': {
        value: true,
        weight: 1
      },
      'manifest-short-name': {
        value: true,
        weight: 0
      }
    };
  }
}

module.exports = AddToHomescreen;
