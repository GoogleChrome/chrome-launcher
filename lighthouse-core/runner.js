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

const Driver = require('./gather/driver.js');
const GatherRunner = require('./gather/gather-runner');
const Aggregate = require('./aggregator/aggregate');
const Audit = require('./audits/audit');
const emulation = require('./lib/emulation');
const log = require('./lib/log');
const fs = require('fs');
const path = require('path');
const URL = require('./lib/url-shim');

class Runner {
  static run(connection, opts) {
    // Clean opts input.
    opts.flags = opts.flags || {};

    const config = opts.config;

    // save the initialUrl provided by the user
    opts.initialUrl = opts.url;
    if (typeof opts.initialUrl !== 'string' || opts.initialUrl.length === 0) {
      return Promise.reject(new Error('You must provide a url to the runner'));
    }

    let parsedURL;
    try {
      parsedURL = new URL(opts.url);
    } catch (e) {
      const err = new Error('The url provided should have a proper protocol and hostname.');
      return Promise.reject(err);
    }

    // If the URL isn't https and is also not localhost complain to the user.
    if (parsedURL.protocol !== 'https:' && parsedURL.hostname !== 'localhost') {
      log.warn('Lighthouse', 'The URL provided should be on HTTPS');
      log.warn('Lighthouse', 'Performance stats will be skewed redirecting from HTTP to HTTPS.');
    }

    // canonicalize URL with any trailing slashes neccessary
    opts.url = parsedURL.href;

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
        opts.driver = opts.driverMock || new Driver(connection);
        // Finally set up the driver to gather.
        run = run.then(_ => GatherRunner.run(config.passes, opts));
      } else if (validArtifactsAndAudits) {
        run = run.then(_ => {
          return Object.assign(GatherRunner.instantiateComputedArtifacts(), config.artifacts);
        });
      }

      // Basic check that the traces (gathered or loaded) are valid.
      run = run.then(artifacts => {
        for (const passName of Object.keys(artifacts.traces || {})) {
          const trace = artifacts.traces[passName];
          if (!Array.isArray(trace.traceEvents)) {
            throw new Error(passName + ' trace was invalid. `traceEvents` was not an array.');
          }
        }

        return artifacts;
      });

      // Run each audit sequentially, the auditResults array has all our fine work
      const auditResults = [];
      for (const audit of config.audits) {
        run = run.then(artifacts => {
          return Runner._runAudit(audit, artifacts)
            .then(ret => auditResults.push(ret))
            .then(_ => artifacts);
        });
      }
      run = run.then(artifacts => {
        return {artifacts, auditResults};
      });
    } else if (config.auditResults) {
      // If there are existing audit results, surface those here.
      // Instantiate and return artifacts for consistency.
      const artifacts = Object.assign(GatherRunner.instantiateComputedArtifacts(),
                                      config.artifacts || {});
      run = run.then(_ => {
        return {
          artifacts,
          auditResults: config.auditResults
        };
      });
    } else {
      const err = Error(
          'The config must provide passes and audits, artifacts and audits, or auditResults');
      return Promise.reject(err);
    }

    // Format and aggregate results before returning.
    run = run
      .then(runResults => {
        const formattedAudits = runResults.auditResults.reduce((formatted, audit) => {
          formatted[audit.name] = audit;
          return formatted;
        }, {});

        // Only run aggregations if needed.
        let aggregations = [];
        if (config.aggregations) {
          aggregations = config.aggregations.map(
            a => Aggregate.aggregate(a, runResults.auditResults));
        }

        return {
          lighthouseVersion: require('../package').version,
          generatedTime: (new Date()).toJSON(),
          initialUrl: opts.initialUrl,
          url: opts.url,
          audits: formattedAudits,
          artifacts: runResults.artifacts,
          runtimeConfig: Runner.getRuntimeConfig(opts.flags),
          aggregations
        };
      });

    return run;
  }

  /**
   * Checks that the audit's required artifacts exist and runs the audit if so.
   * Otherwise returns error audit result.
   * @param {!Audit} audit
   * @param {!Artifacts} artifacts
   * @return {!Promise<!AuditResult>}
   * @private
   */
  static _runAudit(audit, artifacts) {
    const status = `Evaluating: ${audit.meta.description}`;

    return Promise.resolve().then(_ => {
      log.log('status', status);

      // Return an early error if an artifact required for the audit is missing or an error.
      for (const artifactName of audit.meta.requiredArtifacts) {
        const noArtifact = typeof artifacts[artifactName] === 'undefined';

        // If trace required, check that DEFAULT_PASS trace exists.
        // TODO: need pass-specific check of networkRecords and traces.
        const noTrace = artifactName === 'traces' && !artifacts.traces[Audit.DEFAULT_PASS];

        if (noArtifact || noTrace) {
          log.warn('Runner',
              `${artifactName} gatherer, required by audit ${audit.meta.name}, did not run.`);
          throw new Error(`Required ${artifactName} gatherer did not run.`);
        }

        // If artifact was an error, it must be non-fatal (or gatherRunner would
        // have thrown). Output error result on behalf of audit.
        if (artifacts[artifactName] instanceof Error) {
          const artifactError = artifacts[artifactName];
          log.warn('Runner', `${artifactName} gatherer, required by audit ${audit.meta.name},` +
            ` encountered an error: ${artifactError.message}`);
          throw new Error(
              `Required ${artifactName} gatherer encountered an error: ${artifactError.message}`);
        }
      }
      // all required artifacts are in good shape, so we proceed
      return audit.audit(artifacts);
    }).catch(err => {
      if (err.fatal) {
        throw err;
      }

      // Non-fatal error become error audit result.
      return audit.generateErrorAuditResult('Audit error: ' + err.message);
    }).then(result => {
      log.verbose('statusEnd', status);
      return result;
    });
  }

  /**
   * Returns list of audit names for external querying.
   * @return {!Array<string>}
   */
  static getAuditList() {
    const ignoredFiles = [
      'audit.js',
      'accessibility/axe-audit.js',
      'byte-efficiency/byte-efficiency-audit.js'
    ];

    const fileList = [
      ...fs.readdirSync(path.join(__dirname, './audits')),
      ...fs.readdirSync(path.join(__dirname, './audits/dobetterweb')).map(f => `dobetterweb/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/accessibility'))
          .map(f => `accessibility/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/byte-efficiency'))
          .map(f => `byte-efficiency/${f}`)
    ];
    return fileList.filter(f => {
      return /\.js$/.test(f) && !ignoredFiles.includes(f);
    }).sort();
  }

  /**
   * Returns list of gatherer names for external querying.
   * @return {!Array<string>}
   */
  static getGathererList() {
    const fileList = [
      ...fs.readdirSync(path.join(__dirname, './gather/gatherers')),
      ...fs.readdirSync(path.join(__dirname, './gather/gatherers/dobetterweb'))
          .map(f => `dobetterweb/${f}`)
    ];
    return fileList.filter(f => /\.js$/.test(f) && f !== 'gatherer.js').sort();
  }

  /**
   * Resolves the location of the specified plugin and returns an absolute
   * string path to the file. Used for loading custom audits and gatherers.
   * Throws an error if no plugin is found.
   * @param {string} plugin
   * @param {string=} configDir The absolute path to the directory of the config file, if there is one.
   * @param {string=} category Optional plugin category (e.g. 'audit') for better error messages.
   * @return {string}
   * @throws {Error}
   */
  static resolvePlugin(plugin, configDir, category) {
    // First try straight `require()`. Unlikely to be specified relative to this
    // file, but adds support for Lighthouse plugins in npm modules as
    // `require()` walks up parent directories looking inside any node_modules/
    // present. Also handles absolute paths.
    try {
      return require.resolve(plugin);
    } catch (e) {}

    // See if the plugin resolves relative to the current working directory.
    // Most useful to handle the case of invoking Lighthouse as a module, since
    // then the config is an object and so has no path.
    const cwdPath = path.resolve(process.cwd(), plugin);
    try {
      return require.resolve(cwdPath);
    } catch (e) {}

    const errorString = 'Unable to locate ' +
        (category ? `${category}: ` : '') +
        `${plugin} (tried to require() from '${__dirname}' and load from '${cwdPath}'`;

    if (!configDir) {
      throw new Error(errorString + ')');
    }

    // Finally, try looking up relative to the config file path. Just like the
    // relative path passed to `require()` is found relative to the file it's
    // in, this allows plugin paths to be specified relative to the config file.
    const relativePath = path.resolve(configDir, plugin);
    try {
      return require.resolve(relativePath);
    } catch (requireError) {}

    throw new Error(errorString + ` and '${relativePath}')`);
  }

  /**
   * Get runtime configuration specified by the flags
   * @param {!Object} flags
   * @return {!Object} runtime config
   */
  static getRuntimeConfig(flags) {
    const emulationDesc = emulation.getEmulationDesc();
    const environment = [
      {
        name: 'Device Emulation',
        enabled: !flags.disableDeviceEmulation,
        description: emulationDesc['deviceEmulation']
      },
      {
        name: 'Network Throttling',
        enabled: !flags.disableNetworkThrottling,
        description: emulationDesc['networkThrottling']
      },
      {
        name: 'CPU Throttling',
        enabled: !flags.disableCpuThrottling,
        description: emulationDesc['cpuThrottling']
      }
    ];

    return {environment, blockedUrlPatterns: flags.blockedUrlPatterns || []};
  }
}

module.exports = Runner;
