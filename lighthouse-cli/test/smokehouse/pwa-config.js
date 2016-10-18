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

/**
 * Config file for running PWA smokehouse audits.
 */
module.exports = {
  passes: [{
    recordNetwork: true,
    recordTrace: true,
    gatherers: [
      'url',
      'https',
      'manifest',
      // https://github.com/GoogleChrome/lighthouse/issues/566
      // 'cache-contents'
    ]
  },
  {
    passName: 'offlinePass',
    recordNetwork: true,
    gatherers: [
      'service-worker',
      'offline'
    ]
  },
  {
    gatherers: [
      'http-redirect'
    ]
  }],

  audits: [
    'is-on-https',
    'redirects-http',
    'service-worker',
    'works-offline',
    'manifest-display',
    'manifest-exists',
    'manifest-background-color',
    'manifest-theme-color',
    'manifest-icons-min-192',
    'manifest-icons-min-144',
    'manifest-name',
    'manifest-short-name',
    'manifest-start-url',
    // https://github.com/GoogleChrome/lighthouse/issues/566
    // 'cache-start-url'
  ],

  aggregations: []
};
