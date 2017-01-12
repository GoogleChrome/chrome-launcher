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
 * Expected Lighthouse audit values for Do Better Web tests.
 */
module.exports = [
  {
    initialUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
    url: 'http://localhost:10200/dobetterweb/dbw_tester.html',
    audits: {
      'is-on-https': {
        score: false
      },
      'uses-http2': {
        score: false
      },
      'external-anchors-use-rel-noopener': {
        score: false
      },
      'appcache-manifest': {
        score: false
      },
      'geolocation-on-start': {
        score: false
      },
      'link-blocking-first-paint': {
        score: false
      },
      'no-console-time': {
        score: false
      },
      'no-datenow': {
        score: false
      },
      'no-document-write': {
        score: false
      },
      'no-mutation-events': {
        score: false
      },
      'no-old-flexbox': {
        score: false
      },
      'no-websql': {
        score: false
      },
      'notification-on-start': {
        score: false
      },
      'script-blocking-first-paint': {
        score: false
      },
      'unused-css-rules': {
        score: false
      },
      'uses-passive-event-listeners': {
        score: false
      }
    }
  }, {
    initialUrl: 'http://localhost:10200/online-only.html',
    url: 'http://localhost:10200/online-only.html',
    audits: {
      'is-on-https': {
        score: false
      },
      'uses-http2': {
        score: false
      },
      'external-anchors-use-rel-noopener': {
        score: true
      },
      'appcache-manifest': {
        score: true
      },
      'geolocation-on-start': {
        score: true
      },
      'link-blocking-first-paint': {
        score: true
      },
      'no-console-time': {
        score: true
      },
      'no-datenow': {
        score: true
      },
      'no-document-write': {
        score: true
      },
      'no-mutation-events': {
        score: true
      },
      'no-old-flexbox': {
        score: true
      },
      'no-websql': {
        score: true
      },
      'script-blocking-first-paint': {
        score: true
      },
      'unused-css-rules': {
        score: true
      },
      'uses-passive-event-listeners': {
        score: true
      }
    }
  }
];
