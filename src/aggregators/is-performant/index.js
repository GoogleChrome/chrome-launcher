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
const firstMeaningfulPaint = require('../../audits/performance/first-meaningful-paint').name;

/** @type {string} */
const speedIndexMetric = require('../../audits/performance/speed-index-metric').name;

/** @type {string} */
const inputReadinessMetric = require('../../audits/performance/input-readiness-metric').name;

class IsPerformant extends Aggregate {

  /**
   * @override
   * @return {string}
   */
  static get name() {
    return 'Page load performance is fast';
  }

  /**
   * @override
   * @return {string}
   */
  static get description() {
    return `Users notice if sites and apps don't perform well. These top-level metrics capture
            the most important perceived performance concerns.`;
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
    criteria[firstMeaningfulPaint] = {
      value: 100,
      weight: 1
    };
    criteria[speedIndexMetric] = {
      value: 100,
      weight: 1
    };
    criteria[inputReadinessMetric] = {
      value: 100,
      weight: 1
    };

    criteria['scrolling-60fps'] = {
      value: true,
      weight: 0,
      comingSoon: true,
      description: 'Content scrolls at 60fps',
      category: 'UX'
    };

    criteria['touch-150ms'] = {
      value: true,
      weight: 0,
      comingSoon: true,
      description: 'Touch input gets a response in < 150ms',
      category: 'UX'
    };

    criteria['fmp-no-jank'] = {
      value: true,
      weight: 0,
      comingSoon: true,
      description: 'App is interactive without jank after the first meaningful paint',
      category: 'UX'
    };

    return criteria;
  }
}

module.exports = IsPerformant;
