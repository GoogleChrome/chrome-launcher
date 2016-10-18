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
 * Expected Lighthouse audit values for local test pages, one of which works
 * offline with a service worker and one of which does not. Tests against audits
 * defined in 'offline-config.json'.
 */
module.exports = [
  {
    initialUrl: 'http://localhost:10200/online-only.html',
    url: 'http://localhost:10200/online-only.html',
    audits: {
      'service-worker': false,
      'works-offline': false,
      'viewport': true
    }
  },

  {
    initialUrl: 'http://localhost:10503/offline-ready.html',
    url: 'http://localhost:10503/offline-ready.html',
    audits: {
      'service-worker': true,
      'works-offline': true,
      'viewport': true
    }
  }
];
