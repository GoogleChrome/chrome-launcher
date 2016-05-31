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
const viewport = require('../../audits/mobile-friendly/viewport');

class MobileFriendly extends Aggregate {

  /**
   * @override
   * @return {string}
   */
  static get name() {
    return 'Design is mobile-friendly';
  }

  /**
   * @override
   * @return {string}
   */
  static get description() {
    return `Users increasingly experience your app on mobile devices, so it's important to
            ensure that the experience can adapt to smaller screens.`;
  }

  /**
   * @override
   * @return {!AggregationType}
   */
  static get type() {
    return Aggregate.TYPES.PWA;
  }

  /**
   * @override
   * @return {!AggregationCriteria}
   */
  static get criteria() {
    const criteria = {};
    criteria[viewport.meta.name] = {
      value: true,
      weight: 1
    };

    return criteria;
  }
}

module.exports = MobileFriendly;
