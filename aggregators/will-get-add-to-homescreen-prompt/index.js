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
const AddToHomescreen = require('./add-to-homescreen');
const WorksOffline = require('./works-offline');
const MobileFriendly = require('./mobile-friendly');

class WillGetAddToHomescreenPrompt extends Aggregate {

  static get name() {
    return 'Will Get Add to Homescreen Prompt';
  }

  static get criteria() {
    return Object.assign({},
      WorksOffline.criteria,
      AddToHomescreen.criteria,
      MobileFriendly.criteria
    );
  }
}

module.exports = WillGetAddToHomescreenPrompt;
