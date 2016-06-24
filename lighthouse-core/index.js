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

const semver = require('semver');
const Runner = require('./runner');
const log = require('./lib/log.js');
const ChromeProtocol = require('./driver/drivers/cri.js');
const defaultConfig = require('./config/default.json');

// node 5.x required due to use of ES2015 features
if (semver.lt(process.version, '5.0.0')) {
  throw new Error('Lighthouse requires node version 5.0 or newer');
}

module.exports = function(url, flags, config) {
  return new Promise((resolve, reject) => {
    if (!url) {
      return reject(new Error('Lighthouse requires a URL'));
    }
    flags = flags || {};

    // Override the default config with any user config.
    if (!config) {
      config = defaultConfig;
    }

    const driver = new ChromeProtocol();

    // set logging preferences, assume quiet
    log.level = 'error';

    // There's little point in testing the logging level, so skip.
    /* istanbul ignore if */
    if (flags.logLevel) {
      log.level = flags.logLevel;
    }

    // kick off a lighthouse run
    resolve(Runner.run(driver, {url, flags, config}));
  });
};

module.exports.getAuditList = Runner.getAuditList;
module.exports.traceCategories = require('./driver/drivers/driver').traceCategories;
