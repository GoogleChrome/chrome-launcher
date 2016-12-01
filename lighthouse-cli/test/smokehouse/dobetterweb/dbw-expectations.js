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
      'is-on-https': false,
      'uses-http2': false,
      'external-anchors-use-rel-noopener': false,
      'appcache-manifest': false,
      'geolocation-on-start': false,
      'link-blocking-first-paint': false,
      'no-console-time': false,
      'no-datenow': false,
      'no-document-write': false,
      'no-mutation-events': false,
      'no-old-flexbox': false,
      'no-websql': false,
      'notification-on-start': false,
      'script-blocking-first-paint': false,
      'uses-passive-event-listeners': false
    }
  }, {
    initialUrl: 'http://localhost:10200/online-only.html',
    url: 'http://localhost:10200/online-only.html',
    audits: {
      'is-on-https': false,
      'uses-http2': false,
      'external-anchors-use-rel-noopener': true,
      'appcache-manifest': true,
      'geolocation-on-start': true,
      'link-blocking-first-paint': true,
      'no-console-time': true,
      'no-datenow': true,
      'no-document-write': true,
      'no-mutation-events': true,
      'no-old-flexbox': true,
      'no-websql': true,
      'script-blocking-first-paint': true,
      'uses-passive-event-listeners': true
    }
  }
];
