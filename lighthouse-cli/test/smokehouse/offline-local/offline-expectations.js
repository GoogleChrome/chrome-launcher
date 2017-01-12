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
      'is-on-https': {
        score: false
      },
      'redirects-http': {
        score: false
      },
      'service-worker': {
        score: false
      },
      'works-offline': {
        score: false
      },
      'viewport': {
        score: true
      },
      'manifest-display': {
        score: false
      },
      'without-javascript': {
        score: true
      },
      'user-timings': {
        score: true,
        displayValue: '0'
      },
      'critical-request-chains': {
        score: true,
        displayValue: '0'
      },
      'manifest-exists': {
        score: false
      },
      'manifest-background-color': {
        score: false
      },
      'manifest-theme-color': {
        score: false
      },
      'manifest-icons-min-192': {
        score: false
      },
      'manifest-icons-min-144': {
        score: false
      },
      'manifest-name': {
        score: false
      },
      'manifest-short-name': {
        score: false
      },
      'manifest-short-name-length': {
        score: false
      },
      'manifest-start-url': {
        score: false
      },
      'theme-color-meta': {
        score: false
      },
      'aria-valid-attr': {
        score: true
      },
      'aria-allowed-attr': {
        score: true
      },
      'color-contrast': {
        score: true
      },
      'image-alt': {
        score: true
      },
      'label': {
        score: true
      },
      'tabindex': {
        score: true
      },
      'content-width': {
        score: true
      }
    }
  },

  {
    initialUrl: 'http://localhost:10503/offline-ready.html',
    url: 'http://localhost:10503/offline-ready.html',
    audits: {
      'is-on-https': {
        score: false
      },
      'redirects-http': {
        score: false
      },
      'service-worker': {
        score: true
      },
      'works-offline': {
        score: true
      },
      'viewport': {
        score: true
      },
      'manifest-display': {
        score: false
      },
      'without-javascript': {
        score: true
      },
      'user-timings': {
        score: true,
        displayValue: '0'
      },
      'critical-request-chains': {
        score: false,
        displayValue: '1'
      },
      'manifest-exists': {
        score: false
      },
      'manifest-background-color': {
        score: false
      },
      'manifest-theme-color': {
        score: false
      },
      'manifest-icons-min-192': {
        score: false
      },
      'manifest-icons-min-144': {
        score: false
      },
      'manifest-name': {
        score: false
      },
      'manifest-short-name': {
        score: false
      },
      'manifest-short-name-length': {
        score: false
      },
      'manifest-start-url': {
        score: false
      },
      'theme-color-meta': {
        score: false
      },
      'aria-valid-attr': {
        score: true
      },
      'aria-allowed-attr': {
        score: true
      },
      'color-contrast': {
        score: true
      },
      'image-alt': {
        score: false
      },
      'label': {
        score: true
      },
      'tabindex': {
        score: true
      },
      'content-width': {
        score: true
      }
    }
  }
];
