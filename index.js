/**
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

let URL = 'https://voice-memos.appspot.com';

let gatherer = require('./gatherer');
let auditor = require('./auditor');
let ChromeProtocol = require('./helpers/browser/driver');

const driver = new ChromeProtocol();

Promise.resolve(driver).then(gatherer([
  require('./audits/viewport-meta-tag/gather'),
  require('./audits/minify-html/gather'),
  require('./audits/service-worker/gather'),
  require('./gatherers/trace')
], URL)).then(auditor([
  require('./audits/minify-html/audit'),
  require('./audits/service-worker/audit'),
  require('./audits/time-in-javascript/audit'),
  require('./audits/viewport-meta-tag/audit')
])).then(function(results) {
  console.log('all done');
  console.log(results);
  // driver.discardTab(); // FIXME: close connection later
  // process.exit(0);
}).catch(function(err) {
  console.log('error encountered', err);
  console.log(err.stack);
  throw err;
});
