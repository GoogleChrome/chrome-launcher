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
const serviceWorker = require('../../audits/offline/service-worker');
const worksOffline = require('../../audits/offline/works-offline');

class WorksOffline extends Aggregate {

  /**
   * @override
   * @return {string}
   */
  static get name() {
    return 'App can load on offline/flaky connections';
  }

  /**
   * @override
   * @return {string}
   */
  static get description() {
    return `Ensuring your web app can respond when the network connection is unavailable or flaky is
            critical to providing your users a good experience. This is achieved through use of a
            <a href="https://developers.google.com/web/fundamentals/primers/service-worker/">Service Worker</a>.`;
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
    criteria[serviceWorker.meta.name] = {
      value: true,
      weight: 1
    };

    criteria[worksOffline.meta.name] = {
      value: true,
      weight: 1
    };

    criteria['manifest-start-url'] = {
      value: true,
      weight: 0,
      comingSoon: true,
      description: 'Manifest\'s start_url is in cache storage for offline use',
      category: 'Offline'
    };

    return criteria;
  }
}

module.exports = WorksOffline;
