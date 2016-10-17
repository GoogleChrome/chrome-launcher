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
 * Expected Lighthouse audit values for various sites with stable(ish) PWA
 * results.
 */
module.exports = [
  {
    initialUrl: 'https://airhorner.com',
    url: 'https://airhorner.com/',
    audits: {
      'is-on-https': true,
      'redirects-http': true,
      'service-worker': true,
      'works-offline': true,
      'manifest-display': true,
      'manifest-exists': true,
      'manifest-background-color': true,
      'manifest-theme-color': true,
      'manifest-icons-min-192': true,
      'manifest-icons-min-144': true,
      'manifest-name': true,
      'manifest-short-name': true,
      'manifest-start-url': true,
      // 'cache-start-url': true
    }
  },

  {
    initialUrl: 'https://www.chromestatus.com/',
    url: 'https://www.chromestatus.com/features',
    audits: {
      'is-on-https': true,
      'redirects-http': true,
      'service-worker': true,
      'works-offline': false,
      'manifest-display': true,
      'manifest-exists': true,
      'manifest-background-color': true,
      'manifest-theme-color': true,
      'manifest-icons-min-192': true,
      'manifest-icons-min-144': true,
      'manifest-name': true,
      'manifest-short-name': true,
      'manifest-start-url': true,
      // 'cache-start-url': true
    }
  },

  {
    initialUrl: 'https://jakearchibald.github.io/svgomg/',
    url: 'https://jakearchibald.github.io/svgomg/',
    audits: {
      'is-on-https': true,
      'redirects-http': true,
      'service-worker': true,
      'works-offline': true,
      'manifest-display': true,
      'manifest-exists': true,
      'manifest-background-color': true,
      'manifest-theme-color': true,
      'manifest-icons-min-192': true,
      'manifest-icons-min-144': true,
      'manifest-name': true,
      'manifest-short-name': true,
      'manifest-start-url': true,
      // 'cache-start-url': true
    }
  },

  {
    initialUrl: 'https://shop.polymer-project.org/',
    url: 'https://shop.polymer-project.org/',
    audits: {
      'is-on-https': true,
      'redirects-http': true,
      'service-worker': true,
      'works-offline': true,
      'manifest-display': true,
      'manifest-exists': true,
      'manifest-background-color': true,
      'manifest-theme-color': true,
      'manifest-icons-min-192': true,
      'manifest-icons-min-144': true,
      'manifest-name': true,
      'manifest-short-name': true,
      'manifest-start-url': true,
      // 'cache-start-url': true
    }
  },

  {
    initialUrl: 'https://pwa.rocks',
    url: 'https://pwa.rocks/',
    audits: {
      'is-on-https': true,
      'redirects-http': true,
      'service-worker': true,
      'works-offline': true,
      'manifest-display': true,
      'manifest-exists': true,
      'manifest-background-color': true,
      'manifest-theme-color': true,
      'manifest-icons-min-192': true,
      'manifest-icons-min-144': true,
      'manifest-name': true,
      'manifest-short-name': true,
      'manifest-start-url': true,
      // 'cache-start-url': true
    }
  }
];
