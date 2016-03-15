/**
 * Copyright 2015 Google Inc. All rights reserved.
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

var URL = 'https://voice-memos.appspot.com/';

var gatherer = require('./gatherer');
var auditor = require('./auditor');
var Browser = require('./browser');
var _browser;

Browser.construct(URL)
.then(b => _browser = b)
.then(gatherer.bind(null, [
  require('./audits/viewport-meta-tag/gather'),
  require('./audits/minify-html/gather'),
  require('./audits/service-worker/gather'),
  require('./audits/time-in-javascript/gather'),
], URL)).then(auditor.bind(null, [
  require('./audits/minify-html/audit'),
  require('./audits/service-worker/audit'),
  require('./audits/time-in-javascript/audit'),
  require('./audits/viewport-meta-tag/audit'),
])).then(function(results) {
  console.log('all done');
  console.log(results);
  _browser.discardTab();
}).catch(function(err) {
  console.log('error encountered', err);
  console.log(err.stack);
  throw err;
});
