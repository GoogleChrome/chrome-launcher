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

const Aggregate = require('../aggregate');

class AddToHomescreen extends Aggregate {

  static get name() {
    return 'Will Get Add to Homescreen Prompt';
  }

  static get criteria() {
    const manifestExists = require('../../audits/manifest/exists').name;
    const manifestBackgroundColor = require('../../audits/manifest/background-color').name;
    const manifestIcons = require('../../audits/manifest/icons').name;
    const manifestIcons192 = require('../../audits/manifest/icons-192').name;
    const manifestShortName = require('../../audits/manifest/short-name').name;

    const criteria = {};
    criteria[manifestExists] = {
      value: true,
      weight: 1
    };

    criteria[manifestBackgroundColor] = {
      value: true,
      weight: 1
    };

    criteria[manifestIcons] = {
      value: true,
      weight: 1
    };

    criteria[manifestIcons192] = {
      value: true,
      weight: 1
    };

    criteria[manifestShortName] = {
      value: true,
      weight: 0
    };

    return criteria;
  }
}

module.exports = AddToHomescreen;
