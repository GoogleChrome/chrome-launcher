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

const gatherers = gathererClasses.map(G => new G());

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

  return GatherScheduler
      .run(gatherers, Object.assign(opts, {driver}))
      .then(artifacts => Auditor.audit(artifacts, audits))
      .then(results => Aggregator.aggregate(aggregators, results));
};
