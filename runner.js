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

const Auditor = require('./auditor');
const GatherScheduler = require('./gather-scheduler');
const Aggregator = require('./aggregator');

const gathererClasses = [
  require('./gatherers/url'),
  require('./gatherers/https'),
  require('./gatherers/service-worker'),
  require('./gatherers/viewport'),
  require('./gatherers/theme-color'),
  require('./gatherers/html'),
  require('./gatherers/manifest'),
  require('./gatherers/offline')
];

const audits = [
  require('./audits/security/is-on-https'),
  require('./audits/offline/service-worker'),
  require('./audits/offline/works-offline'),
  require('./audits/mobile-friendly/viewport'),
  require('./audits/performance/first-meaningful-paint'),
  require('./audits/manifest/exists'),
  require('./audits/manifest/background-color'),
  require('./audits/manifest/theme-color'),
  require('./audits/manifest/icons-min-192'),
  require('./audits/manifest/icons-min-144'),
  require('./audits/manifest/name'),
  require('./audits/manifest/short-name'),
  require('./audits/manifest/short-name-length'),
  require('./audits/manifest/start-url'),
  require('./audits/html/meta-theme-color')
];

const aggregators = [
  require('./aggregators/will-get-add-to-homescreen-prompt'),
  require('./aggregators/launches-with-splash-screen'),
  require('./aggregators/omnibox-is-themed'),
  require('./aggregators/can-load-offline'),
  require('./aggregators/is-secure'),
  require('./aggregators/is-performant'),
  require('./aggregators/is-sized-for-mobile-screen')
];

module.exports = function(driver, opts) {
  // Default mobile emulation and page loading to true.
  // The extension will switch these off initially.
  if (typeof opts.flags.mobile === 'undefined') {
    opts.flags.mobile = true;
  }

  if (typeof opts.flags.loadPage === 'undefined') {
    opts.flags.loadPage = true;
  }

  const gatherers = gathererClasses.map(G => new G());

  return GatherScheduler
      .run(gatherers, Object.assign({}, opts, {driver}))
      .then(artifacts => Auditor.audit(artifacts, audits))
      .then(results => Aggregator.aggregate(aggregators, results));
};
