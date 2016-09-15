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

const GatherRunner = require('./gather/gather-runner');
const Aggregate = require('./aggregator/aggregate');
const assetSaver = require('./lib/asset-saver');
const log = require('./lib/log');
const fs = require('fs');
const path = require('path');
const url = require('url');

class Runner {
  static run(driver, opts) {
    // Clean opts input.
    opts.flags = opts.flags || {};

    // Default mobile emulation and page loading to true.
    // The extension will switch these off initially.
    if (typeof opts.flags.mobile === 'undefined') {
      opts.flags.mobile = true;
    }

    const config = opts.config;

    // save the initialUrl provided by the user
    opts.initialUrl = opts.url;
    if (typeof opts.initialUrl !== 'string' || opts.initialUrl.length === 0) {
      return Promise.reject(new Error('You must provide a url to the driver'));
    }
    const parsedURL = url.parse(opts.url);
    // canonicalize URL with any trailing slashes neccessary
    opts.url = url.format(parsedURL);

    if (!parsedURL.protocol || !parsedURL.hostname) {
      const err = new Error('The url provided should have a proper protocol and hostname.');
      return Promise.reject(err);
    }
    // If the URL isn't https and is also not localhost complain to the user.
    if (!parsedURL.protocol.includes('https') && parsedURL.hostname !== 'localhost') {
      log.warn('Lighthouse', 'The URL provided should be on HTTPS');
      log.warn('Lighthouse', 'Performance stats will be skewed redirecting from HTTP to HTTPS.');
    }

    // Check that there are passes & audits...
    const validPassesAndAudits = config.passes && config.audits;

    // ... or that there are artifacts & audits.
    const validArtifactsAndAudits = config.artifacts && config.audits;

    // Make a run, which can be .then()'d with whatever needs to run (based on the config).
    let run = Promise.resolve();

    // If there are passes run the GatherRunner and gather the artifacts. If not, we will need
    // to check that there are artifacts specified in the config, and throw if not.
    if (validPassesAndAudits || validArtifactsAndAudits) {
      if (validPassesAndAudits) {
        opts.driver = driver;
        // Finally set up the driver to gather.
        run = run.then(_ => GatherRunner.run(config.passes, opts));
      } else if (validArtifactsAndAudits) {
        run = run.then(_ => {
          return Object.assign(GatherRunner.instantiateComputedArtifacts(), config.artifacts);
        });
      }

      // Ignoring these two flags for coverage as this functionality is not exposed by the module.
      /* istanbul ignore next */
      if (opts.flags.saveArtifacts || opts.flags.saveAssets) {
        run = run.then(artifacts => {
          opts.flags.saveArtifacts && assetSaver.saveArtifacts(artifacts);
          opts.flags.saveAssets && assetSaver.saveAssets(opts, artifacts);
          return artifacts;
        });
      }

      // Now run the audits.
      let auditResults = [];
      run = run.then(artifacts => config.audits.reduce((chain, audit) => {
        const status = `Evaluating: ${audit.meta.description}`;
        // Run each audit sequentially, the auditResults array has all our fine work
        return chain.then(_ => {
          log.log('status', status);
          return audit.audit(artifacts);
        }).then(ret => {
          log.verbose('statusEnd', status);
          auditResults.push(ret);
        });
      }, Promise.resolve()).then(_ => auditResults));
    } else if (config.auditResults) {
      // If there are existing audit results, surface those here.
      run = run.then(_ => config.auditResults);
    } else {
      throw new Error(
          'The config must provide passes and audits, artifacts and audits, or auditResults');
    }

    // Format and aggregate results before returning.
    run = run
      .then(auditResults => {
        const formattedAudits = auditResults.reduce((formatted, audit) => {
          formatted[audit.name] = audit;
          return formatted;
        }, {});

        // Only run aggregations if needed.
        let aggregations = [];
        if (config.aggregations) {
          aggregations = config.aggregations.map(a => Aggregate.aggregate(a, auditResults));
        }

        return {
          initialUrl: opts.initialUrl,
          url: opts.url,
          audits: formattedAudits,
          aggregations
        };
      });

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

  /**
   * Returns list of gatherer names for external querying.
   * @return {!Array<string>}
   */
  static getGathererList() {
    return fs
        .readdirSync(path.join(__dirname, './gather/gatherers'))
        .filter(f => /\.js$/.test(f));
  }
}

module.exports = Runner;
