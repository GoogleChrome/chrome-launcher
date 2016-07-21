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

const Driver = require('./driver');
const Aggregator = require('./aggregator');
const assetSaver = require('./lib/asset-saver');
const log = require('./lib/log');
const fs = require('fs');
const path = require('path');

class Runner {
  static run(driver, opts) {
    const config = opts.config;

    // Check that there are passes & audits...
    const validPassesAndAudits = config.passes && config.audits;

    // ... or that there are artifacts & audits.
    const validArtifactsAndAudits = config.artifacts && config.audits;

    // Make a run, which can be .then()'d with whatever needs to run (based on the config).
    let run = Promise.resolve();

    // If there are passes run the Driver and gather the artifacts. If not, we will need
    // to check that there are artifacts specified in the config, and throw if not.
    if (validPassesAndAudits || validArtifactsAndAudits) {
      if (validPassesAndAudits) {
        // Finally set up the driver to gather.
        run = run.then(_ => Driver.run(config.passes, Object.assign({}, opts, {driver})));
      } else if (validArtifactsAndAudits) {
        run = run.then(_ => config.artifacts);
      }

      // Ignoring these two flags since this functionality is not exposed by the module.
      /* istanbul ignore next */
      if (opts.flags.saveArtifacts) {
        run = run.then(artifacts => {
          assetSaver.saveArtifacts(artifacts);
          return artifacts;
        });
      }

      /* istanbul ignore next */
      if (opts.flags.saveAssets) {
        run = run.then(artifacts => {
          assetSaver.saveAssets(opts, artifacts);
          return artifacts;
        });
      }

      // Now run the audits.
      run = run.then(artifacts => Promise.all(config.audits.map(audit => {
        const status = `Evaluating: ${audit.meta.description}`;
        log.log('status', status);
        return Promise.resolve(audit.audit(artifacts)).then(ret => {
          log.log('statusEnd', status);
          return ret;
        });
      })));
    } else if (config.auditResults) {
      // If there are existing audit results, surface those here.
      run = run.then(_ => config.auditResults);
    } else {
      throw new Error(
          'The config must provide passes and audits, artifacts and audits, or auditResults');
    }

    // Only run aggregations if needed.
    if (config.aggregations) {
      run = run
          .then(results => Aggregator.aggregate(config.aggregations, results))
          .then(aggregations => {
            return {
              url: opts.url,
              aggregations
            };
          });
    }

    return run;
  }

  /**
   * Returns list of audit names for external querying.
   * @return {!Array<string>}
   */
  static getAuditList() {
    return fs
        .readdirSync(path.join(__dirname, './audits'))
        .filter(f => /\.js$/.test(f));
  }
}

module.exports = Runner;
