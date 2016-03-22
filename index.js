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

const url = 'https://voice-memos.appspot.com';
const ChromeProtocol = require('./helpers/browser/driver');

const Auditor = require('./auditor');
const Gatherer = require('./gatherer');

const driver = new ChromeProtocol();
const gatherer = new Gatherer();
const auditor = new Auditor();
const gatherers = [
  require('./gatherers/load-trace'),
  require('./gatherers/https'),
  require('./gatherers/service-worker'),
  require('./gatherers/html'),
  require('./gatherers/manifest')
];
const audits = [
  require('./audits/security/is-on-https'),
  require('./audits/offline/service-worker'),
  require('./audits/mobile-friendly/viewport'),
  require('./audits/manifest/exists'),
  require('./audits/manifest/background-color'),
  require('./audits/manifest/theme-color'),
  require('./audits/manifest/icons'),
  require('./audits/manifest/icons-192'),
  require('./audits/manifest/name'),
  require('./audits/manifest/short-name'),
  require('./audits/manifest/start-url')
];

gatherer
    .gather(gatherers, {url, driver})
    .then(artifacts => auditor.audit(artifacts, audits))
    .then(results => {
      console.log(results);
    }).catch(function(err) {
      console.log('error encountered', err);
      console.log(err.stack);
      throw err;
    });
