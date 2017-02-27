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

const log = require('../lib/log.js');
const Audit = require('../audits/audit');
const path = require('path');
const URL = require('../lib/url-shim');

/**
 * Class that drives browser to load the page and runs gatherer lifecycle hooks.
 * Execution sequence when GatherRunner.run() is called:
 *
 * 1. Setup
 *   A. navigate to about:blank
 *   B. driver.connect()
 *   C. GatherRunner.setupDriver()
 *     i. assertNoSameOriginServiceWorkerClients
 *     ii. beginEmulation
 *     iii. enableRuntimeEvents
 *     iv. evaluateScriptOnLoad rescue native Promise from potential polyfill
 *     v. cleanAndDisableBrowserCaches
 *     vi. clearDataForOrigin
 *     vii. blockUrlPatterns
 *
 * 2. For each pass in the config:
 *   A. GatherRunner.beforePass()
 *     i. navigate to about:blank
 *     ii. all gatherer's beforePass()
 *   B. GatherRunner.pass()
 *     i. GatherRunner.loadPage()
 *       b. beginTrace (if requested) & beginNetworkCollect
 *       c. navigate to options.url (and wait for onload)
 *     ii. all gatherer's pass()
 *   C. GatherRunner.afterPass()
 *     i. endTrace (if requested) & endNetworkCollect
 *     ii. all gatherer's afterPass()
 *
 * 3. Teardown
 *   A. GatherRunner.disposeDriver()
 *   B. collect all artifacts and return them
 *     i. collectArtifacts() from completed passes on each gatherer
 *     ii. add trace data and computed artifact methods
 */
class GatherRunner {
  /**
   * Loads about:blank and waits there briefly. Since a Page.reload command does
   * not let a service worker take over, we navigate away and then come back to
   * reload. We do not `waitForLoad` on about:blank since a page load event is
   * never fired on it.
   * @param {!Driver} driver
   * @param {url=} url
   * @param {number=} duration
   * @return {!Promise}
   */
  static loadBlank(driver, url = 'about:blank', duration = 300) {
    return driver.gotoURL(url).then(_ => new Promise(resolve => setTimeout(resolve, duration)));
  }

  /**
   * Loads options.url with specified options.
   * @param {!Driver} driver
   * @param {!Object} options
   * @return {!Promise}
   */
  static loadPage(driver, options) {
    return Promise.resolve()
      // Begin tracing only if requested by config.
      .then(_ => options.config.recordTrace && driver.beginTrace())
      // Network is always recorded for internal use, even if not saved as artifact.
      .then(_ => driver.beginNetworkCollect(options))
      // Navigate.
      .then(_ => driver.gotoURL(options.url, {
        waitForLoad: true,
        disableJavaScript: !!options.disableJavaScript,
        flags: options.flags,
      }));
  }

  static setupDriver(driver, options) {
    log.log('status', 'Initializing…');
    const resetStorage = !options.flags.disableStorageReset;
    // Enable emulation based on flags
    return driver.assertNoSameOriginServiceWorkerClients(options.url)
      .then(_ => driver.beginEmulation(options.flags))
      .then(_ => driver.enableRuntimeEvents())
      .then(_ => driver.cacheNatives())
      .then(_ => resetStorage && driver.cleanAndDisableBrowserCaches())
      .then(_ => resetStorage && driver.clearDataForOrigin(options.url))
      .then(_ => driver.blockUrlPatterns(options.flags.blockedUrlPatterns || []));
  }

  static disposeDriver(driver) {
    // We dont need to hold up the reporting for the reload/disconnect,
    // so we will not return a promise in here.
    log.log('status', 'Disconnecting from browser...');
    driver.disconnect().catch(err => {
      // Ignore disconnecting error if browser was already closed.
      // See https://github.com/GoogleChrome/lighthouse/issues/1583
      if (!(/close\/.*status: 500$/.test(err.message))) {
        log.error('GatherRunner disconnect', err.message);
      }
    });
  }

  /**
   * Test any error output from the promise, absorbing non-fatal errors and
   * throwing on fatal ones so that run is stopped.
   * @param {!Promise<*>} promise
   * @return {!Promise<*>}
   */
  static recoverOrThrow(promise) {
    return promise.catch(err => {
      if (err.fatal) {
        throw err;
      }
    });
  }

  /**
   * Throws an error if the original network request failed or wasn't found.
   * @param {string} url The URL of the original requested page.
   * @param {{online: boolean}} driver
   * @param {!Array<WebInspector.NetworkRequest>} networkRecords
   */
  static assertPageLoaded(url, driver, networkRecords) {
    const mainRecord = networkRecords.find(record => {
      // record.url is actual request url, so needs to be compared without any URL fragment.
      return URL.equalWithExcludedFragments(record.url, url);
    });
    if (driver.online && (!mainRecord || mainRecord.failed)) {
      const message = mainRecord ? mainRecord.localizedFailDescription : 'timeout reached';
      log.error('GatherRunner', message);
      const error = new Error(`Unable to load the page: ${message}`);
      error.code = 'PAGE_LOAD_ERROR';
      throw error;
    }
  }

  /**
   * Navigates to about:blank and calls beforePass() on gatherers before tracing
   * has started and before navigation to the target page.
   * @param {!Object} options
   * @param {!Object<!Array<!Promise<*>>} gathererResults
   * @return {!Promise}
   */
  static beforePass(options, gathererResults) {
    const blankPage = options.config.blankPage;
    const blankDuration = options.config.blankDuration;
    const pass = GatherRunner.loadBlank(options.driver, blankPage, blankDuration);

    return options.config.gatherers.reduce((chain, gatherer) => {
      return chain.then(_ => {
        const artifactPromise = Promise.resolve().then(_ => gatherer.beforePass(options));
        gathererResults[gatherer.name] = [artifactPromise];
        return GatherRunner.recoverOrThrow(artifactPromise);
      });
    }, pass);
  }

  /**
   * Navigates to requested URL and then runs pass() on gatherers while trace
   * (if requested) is still being recorded.
   * @param {!Object} options
   * @param {!Object<!Array<!Promise<*>>} gathererResults
   * @return {!Promise}
   */
  static pass(options, gathererResults) {
    const driver = options.driver;
    const config = options.config;
    const gatherers = config.gatherers;

    const gatherernames = gatherers.map(g => g.name).join(', ');
    const status = 'Loading page & waiting for onload';
    log.log('status', status, gatherernames);

    const pass = GatherRunner.loadPage(driver, options).then(_ => {
      log.log('statusEnd', status);
    });

    return gatherers.reduce((chain, gatherer) => {
      return chain.then(_ => {
        const artifactPromise = Promise.resolve().then(_ => gatherer.pass(options));
        gathererResults[gatherer.name].push(artifactPromise);
        return GatherRunner.recoverOrThrow(artifactPromise);
      });
    }, pass);
  }

  /**
   * Ends tracing and collects trace data (if requested for this pass), and runs
   * afterPass() on gatherers with trace data passed in. Promise resolves with
   * object containing trace and network data.
   * @param {!Object} options
   * @param {!Object<!Array<!Promise<*>>} gathererResults
   * @return {!Promise}
   */
  static afterPass(options, gathererResults) {
    const driver = options.driver;
    const config = options.config;
    const gatherers = config.gatherers;
    const passData = {};

    let pass = Promise.resolve();

    if (config.recordTrace) {
      pass = pass.then(_ => {
        log.log('status', 'Retrieving trace');
        return driver.endTrace(config.pauseBeforeTraceEndMs);
      }).then(traceContents => {
        // Before Chrome 54.0.2816 (codereview.chromium.org/2161583004),
        // traceContents was an array of trace events; after, traceContents is
        // an object with a traceEvents property. Normalize to object form.
        passData.trace = Array.isArray(traceContents) ?
            {traceEvents: traceContents} : traceContents;
        passData.devtoolsLog = driver.devtoolsLog;
        log.verbose('statusEnd', 'Retrieving trace');
      });
    }

    const status = 'Retrieving network records';
    pass = pass.then(_ => {
      log.log('status', status);
      return driver.endNetworkCollect();
    }).then(networkRecords => {
      GatherRunner.assertPageLoaded(options.url, driver, networkRecords);

      // Network records only given to gatherers if requested by config.
      config.recordNetwork && (passData.networkRecords = networkRecords);
      log.verbose('statusEnd', status);
    });

    pass = gatherers.reduce((chain, gatherer) => {
      const status = `Retrieving: ${gatherer.name}`;
      return chain.then(_ => {
        log.log('status', status);
        const artifactPromise = Promise.resolve().then(_ => gatherer.afterPass(options, passData));
        gathererResults[gatherer.name].push(artifactPromise);
        return GatherRunner.recoverOrThrow(artifactPromise);
      }).then(_ => {
        log.verbose('statusEnd', status);
      });
    }, pass);

    // Resolve on tracing data using passName from config.
    return pass.then(_ => passData);
  }

  /**
   * Takes the results of each gatherer phase for each gatherer and uses the
   * last produced value (that's not undefined) as the artifact for that
   * gatherer. If a non-fatal error was rejected from a gatherer phase,
   * uses that error object as the artifact instead.
   * @param {!Object<!Array<!Promise<*>>} gathererResults
   * @return {!Promise<!Artifacts>}
   */
  static collectArtifacts(gathererResults) {
    const artifacts = {};

    return Object.keys(gathererResults).reduce((chain, gathererName) => {
      return chain.then(_ => {
        const phaseResultsPromises = gathererResults[gathererName];
        return Promise.all(phaseResultsPromises).then(phaseResults => {
          // Take last defined pass result as artifact.
          const definedResults = phaseResults.filter(element => element !== undefined);
          const artifact = definedResults[definedResults.length - 1];
          if (artifact === undefined) {
            throw new Error(`${gathererName} failed to provide an artifact.`);
          }
          artifacts[gathererName] = artifact;
        }, err => {
          // To reach this point, all errors are non-fatal, so return err to
          // runner to handle turning it into an error audit.
          artifacts[gathererName] = err;
        });
      });
    }, Promise.resolve()).then(_ => {
      return artifacts;
    });
  }

  static run(passes, options) {
    const driver = options.driver;
    const tracingData = {
      traces: {},
      devtoolsLogs: {},
      networkRecords: {}
    };

    if (typeof options.url !== 'string' || options.url.length === 0) {
      return Promise.reject(new Error('You must provide a url to the gather-runner'));
    }

    if (typeof options.flags === 'undefined') {
      options.flags = {};
    }

    if (typeof options.config === 'undefined') {
      return Promise.reject(new Error('You must provide a config'));
    }

    // CPU throttling is temporarily off by default
    if (typeof options.flags.disableCpuThrottling === 'undefined') {
      options.flags.disableCpuThrottling = true;
    }

    passes = this.instantiateGatherers(passes, options.config.configDir);

    const gathererResults = {};

    return driver.connect()
      .then(_ => GatherRunner.loadBlank(driver))
      .then(_ => GatherRunner.setupDriver(driver, options))

      // Run each pass
      .then(_ => {
        // If the main document redirects, we'll update this to keep track
        let urlAfterRedirects;
        return passes.reduce((chain, config, passIndex) => {
          const runOptions = Object.assign({}, options, {config});
          return chain
            .then(_ => driver.setThrottling(options.flags, config))
            .then(_ => GatherRunner.beforePass(runOptions, gathererResults))
            .then(_ => GatherRunner.pass(runOptions, gathererResults))
            .then(_ => GatherRunner.afterPass(runOptions, gathererResults))
            .then(passData => {
              // If requested by config, merge trace and network data for this
              // pass into tracingData.
              const passName = config.passName || Audit.DEFAULT_PASS;
              if (config.recordTrace) {
                tracingData.traces[passName] = passData.trace;
                tracingData.devtoolsLogs[passName] = passData.devtoolsLog;
              }
              config.recordNetwork &&
                  (tracingData.networkRecords[passName] = passData.networkRecords);

              if (passIndex === 0) {
                urlAfterRedirects = runOptions.url;
              }
            });
        }, Promise.resolve()).then(_ => {
          options.url = urlAfterRedirects;
        });
      })
      .then(_ => GatherRunner.disposeDriver(driver))
      .then(_ => GatherRunner.collectArtifacts(gathererResults))
      .then(artifacts => {
        // Add tracing data and computed artifacts to artifacts object.
        const computedArtifacts = this.instantiateComputedArtifacts();
        Object.assign(artifacts, computedArtifacts, tracingData);
        return artifacts;
      })
      // cleanup on error
      .catch(err => {
        GatherRunner.disposeDriver(driver);

        throw err;
      });
  }

  static getGathererClass(nameOrGathererClass, configPath) {
    const Runner = require('../runner');
    const coreList = Runner.getGathererList();

    let GathererClass;
    if (typeof nameOrGathererClass === 'string') {
      const name = nameOrGathererClass;

      // See if the gatherer is a Lighthouse core gatherer.
      const coreGatherer = coreList.find(a => a === `${name}.js`);
      let requirePath = `./gatherers/${name}`;
      if (!coreGatherer) {
        // Otherwise, attempt to find it elsewhere. This throws if not found.
        requirePath = Runner.resolvePlugin(name, configPath, 'gatherer');
      }

      GathererClass = require(requirePath);

      this.assertValidGatherer(GathererClass, name);
    } else {
      GathererClass = nameOrGathererClass;
      this.assertValidGatherer(GathererClass);
    }

    return GathererClass;
  }

  static assertValidGatherer(GathererDefinition, gathererName) {
    const gathererInstance = new GathererDefinition();
    gathererName = gathererName || gathererInstance.name || 'gatherer';

    if (typeof gathererInstance.beforePass !== 'function') {
      throw new Error(`${gathererName} has no beforePass() method.`);
    }

    if (typeof gathererInstance.pass !== 'function') {
      throw new Error(`${gathererName} has no pass() method.`);
    }

    if (typeof gathererInstance.afterPass !== 'function') {
      throw new Error(`${gathererName} has no afterPass() method.`);
    }
  }

  static instantiateComputedArtifacts() {
    const computedArtifacts = {};
    require('fs').readdirSync(path.join(__dirname, 'computed')).forEach(function(file) {
      // Drop `.js` suffix to keep browserify import happy.
      file = file.replace(/\.js$/, '');
      const ArtifactClass = require('./computed/' + file);
      const artifact = new ArtifactClass();
      // define the request* function that will be exposed on `artifacts`
      computedArtifacts['request' + artifact.name] = artifact.request.bind(artifact);
    });
    return computedArtifacts;
  }

  static instantiateGatherers(passes, rootPath) {
    return passes.map(pass => {
      pass.gatherers = pass.gatherers.map(gatherer => {
        // If this is already instantiated, don't do anything else.
        if (typeof gatherer !== 'string') {
          return gatherer;
        }

        const GathererClass = GatherRunner.getGathererClass(gatherer, rootPath);
        return new GathererClass();
      });

      return pass;
    });
  }
}

module.exports = GatherRunner;
