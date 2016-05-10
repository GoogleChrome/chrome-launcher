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

/** @type {string} */
const ARIAValidAttr =
    require('../../audits/accessibility/aria-valid-attr').name;

/** @type {string} */
const manifestShortNameLength = require('../../audits/manifest/short-name-length').name;

/** @type {string} */
const display = require('../../audits/mobile-friendly/display').name;

class IsAccessible extends Aggregate {

  /**
   * @override
   * @return {string}
   */
  static get name() {
    return 'Best Practices';
  }

  /**
   * @override
   * @return {string}
   */
  static get description() {
    return '';
  }

  /**
   * @override
   * @return {!AggregationType}
   */
  static get type() {
    return Aggregate.TYPES.BEST_PRACTICE;
  }

  /**
   * @override
   * @return {!AggregationCriteria}
   */
  static get criteria() {
    const criteria = {};
    criteria[ARIAValidAttr] = {
      value: true,
      weight: 1
    };

    criteria[manifestShortNameLength] = {
      value: true,
      weight: 1
    };

    criteria[display] = {
      value: true,
      weight: 0
    };

    return criteria;
  }
}

module.exports = IsAccessible;
