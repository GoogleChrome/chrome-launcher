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
const ARIAAllowedAttr =
    require('../../audits/accessibility/aria-allowed-attr').name;

/** @type {string} */
const ARIAValidAttr =
    require('../../audits/accessibility/aria-valid-attr').name;

/** @type {string} */
const ColorContrast =
    require('../../audits/accessibility/color-contrast').name;

/** @type {string} */
const ImageAlt =
    require('../../audits/accessibility/image-alt').name;

/** @type {string} */
const Label =
    require('../../audits/accessibility/label').name;

/** @type {string} */
const TabIndex =
    require('../../audits/accessibility/tabindex').name;

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
    criteria[ARIAAllowedAttr] = {
      value: true,
      weight: 1
    };

    criteria[ARIAValidAttr] = {
      value: true,
      weight: 1
    };

    criteria[ColorContrast] = {
      value: true,
      weight: 1
    };

    criteria[ImageAlt] = {
      value: true,
      weight: 1
    };

    criteria[Label] = {
      value: true,
      weight: 1
    };

    criteria[TabIndex] = {
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

    criteria['serviceworker-push'] = {
      value: true,
      weight: 0,
      comingSoon: true,
      description: 'Service worker makes use of push notifications, if appropriate',
      category: 'UX'
    };

    criteria['tap-targets'] = {
      value: true,
      weight: 0,
      comingSoon: true,
      description: 'Tap targets are appropriately sized for touch',
      category: 'UX'
    };

    criteria['payments-autocomplete'] = {
      value: true,
      weight: 0,
      comingSoon: true,
      description: 'Payment forms marked up with [autocomplete] attributes',
      category: 'UX'
    };

    criteria['login-autocomplete'] = {
      value: true,
      weight: 0,
      comingSoon: true,
      description: 'Login forms marked up with [autocomplete] attributes',
      category: 'UX'
    };

    criteria['input-type'] = {
      value: true,
      weight: 0,
      comingSoon: true,
      description: 'Input fields use appropriate [type] attributes for custom keyboards',
      category: 'UX'
    };

    return criteria;
  }
}

module.exports = IsAccessible;
