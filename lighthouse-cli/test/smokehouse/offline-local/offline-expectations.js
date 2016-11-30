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
 * Expected Lighthouse results from testing the defaut audits on local test
 * pages, one of which works offline with a service worker and one of which does
 * not.
 */
module.exports = [
  {
    initialUrl: 'http://localhost:10200/online-only.html',
    url: 'http://localhost:10200/online-only.html',
    audits: {
      'is-on-https': false,
      'redirects-http': false,
      'service-worker': false,
      'works-offline': false,
      'viewport': true,
      'manifest-display': false,
      'without-javascript': true,
      'user-timings': true,
      'critical-request-chains': false,
      'manifest-exists': false,
      'manifest-background-color': false,
      'manifest-theme-color': false,
      'manifest-icons-min-192': false,
      'manifest-icons-min-144': false,
      'manifest-name': false,
      'manifest-short-name': false,
      'manifest-short-name-length': false,
      'manifest-start-url': false,
      'theme-color-meta': false,
      'aria-valid-attr': true,
      'aria-allowed-attr': true,
      'color-contrast': true,
      'image-alt': true,
      'label': true,
      'tabindex': true,
      'content-width': true
    }
  },

  {
    initialUrl: 'http://localhost:10503/offline-ready.html',
    url: 'http://localhost:10503/offline-ready.html',
    audits: {
      'is-on-https': false,
      'redirects-http': false,
      'service-worker': true,
      'works-offline': true,
      'viewport': true,
      'manifest-display': false,
      'without-javascript': true,
      'user-timings': true,
      'critical-request-chains': false,
      'manifest-exists': false,
      'manifest-background-color': false,
      'manifest-theme-color': false,
      'manifest-icons-min-192': false,
      'manifest-icons-min-144': false,
      'manifest-name': false,
      'manifest-short-name': false,
      'manifest-short-name-length': false,
      'manifest-start-url': false,
      'theme-color-meta': false,
      'aria-valid-attr': true,
      'aria-allowed-attr': true,
      'color-contrast': true,
      'image-alt': false,
      'label': true,
      'tabindex': true,
      'content-width': true
    }
  }
];
