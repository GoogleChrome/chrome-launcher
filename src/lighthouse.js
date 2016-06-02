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
const Scheduler = require('./scheduler');
const Aggregator = require('./aggregator');
const log = require('./lib/log.js');

const GATHERER_CLASSES = [
  require('./gatherers/url'),
  require('./gatherers/https'),
  require('./gatherers/http-redirect'),
  require('./gatherers/service-worker'),
  require('./gatherers/viewport'),
  require('./gatherers/theme-color'),
  require('./gatherers/html'),
  require('./gatherers/manifest'),
  require('./gatherers/accessibility'),
  require('./gatherers/screenshots'),
  require('./gatherers/offline'),
  require('./gatherers/critical-request-chains')
];

const AUDITS = [
  require('./audits/security/is-on-https'),
  require('./audits/security/redirects-http'),
  require('./audits/offline/service-worker'),
  require('./audits/offline/works-offline'),
  require('./audits/mobile-friendly/viewport'),
  require('./audits/mobile-friendly/display'),
  require('./audits/performance/first-meaningful-paint'),
  require('./audits/performance/speed-index-metric'),
  require('./audits/performance/user-timings'),
  require('./audits/performance/screenshots'),
  // TODO: https://github.com/GoogleChrome/lighthouse/issues/336
  // require('./audits/performance/input-readiness-metric'),
  require('./audits/performance/critical-request-chains'),
  require('./audits/manifest/exists'),
  require('./audits/manifest/background-color'),
  require('./audits/manifest/theme-color'),
  require('./audits/manifest/icons-min-192'),
  require('./audits/manifest/icons-min-144'),
  require('./audits/manifest/name'),
  require('./audits/manifest/short-name'),
  require('./audits/manifest/short-name-length'),
  require('./audits/manifest/start-url'),
  require('./audits/html/meta-theme-color'),
  require('./audits/accessibility/aria-valid-attr'),
  require('./audits/accessibility/aria-allowed-attr'),
  require('./audits/accessibility/color-contrast'),
  require('./audits/accessibility/image-alt'),
  require('./audits/accessibility/label'),
  require('./audits/accessibility/tabindex')
];

const AGGREGATORS = [
  require('./aggregators/can-load-offline'),
  require('./aggregators/is-performant'),
  require('./aggregators/is-secure'),
  require('./aggregators/will-get-add-to-homescreen-prompt'),
  require('./aggregators/launches-with-splash-screen'),
  require('./aggregators/address-bar-is-themed'),
  require('./aggregators/is-sized-for-mobile-screen'),
  require('./aggregators/best-practices'),
  require('./aggregators/performance-metrics')
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

  // Discard any audits not whitelisted.
  let audits = AUDITS;
  let rejected;

  // Testing this will require exposing the functionality at the module level, which
  // isn't really necessary (and probably confusing for people using Lighthouse), so we'll
  // skip this when testing coverage.
  /* istanbul ignore if */
  if (opts.flags.auditWhitelist) {
    const whitelist = opts.flags.auditWhitelist;
    rejected = audits.filter(audit => !whitelist.has(audit.meta.name));
    audits = audits.filter(audit => whitelist.has(audit.meta.name));
    if (rejected.length) {
      log.log('info', 'Running these audits:', `${audits.map(a => a.meta.name).join(', ')}`);
      log.log('info', 'Skipping these audits:', `${rejected.map(a => a.meta.name).join(', ')}`);
    }
  }

  // Collate all artifacts required by audits to be run.
  const auditArtifacts = audits.map(audit => audit.meta.requiredArtifacts);
  const requiredArtifacts = new Set([].concat(...auditArtifacts));

  // Instantiate gatherers and discard any not needed by requested audits.
  // For now, the trace and network records are assumed to be required.
  const gatherers = GATHERER_CLASSES.map(G => new G())
    .filter(gatherer => requiredArtifacts.has(gatherer.name));

  // The runs of Lighthouse should be tested in integration / smoke tests, so testing for coverage
  // here, at least from a unit test POV, is relatively low merit.
  /* istanbul ignore next */
  return Scheduler
      .run(gatherers, Object.assign({}, opts, {driver}))
      .then(artifacts => Auditor.audit(artifacts, audits))
      .then(results => Aggregator.aggregate(AGGREGATORS, results))
      .then(aggregations => {
        return {
          url: opts.url,
          aggregations
        };
      });
};

/**
 * Returns list of audit names for external querying.
 * @return {!Array<string>}
 */
module.exports.getAuditList = function() {
  return AUDITS.map(audit => audit.meta.name);
};
