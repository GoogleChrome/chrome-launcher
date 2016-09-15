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

/**
 * Class that drives browser to load the page and runs gatherer lifecycle hooks.
 * Execution sequence when GatherRunner.run() is called:
 *
 * 1. Setup
 *   A. driver.connect()
 *   B. GatherRunner.setupDriver()
 *     i. beginEmulation
 *     ii. cleanAndDisableBrowserCaches
 *     iii. clearDataForOrigin
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
 *   A. reloadForCleanStateIfNeeded
 *   B. driver.disconnect()
 *   C. collect all artifacts and return them
 */
class GatherRunner {
  /**
   * Loads about:blank and waits there briefly. Since a Page.reload command does
   * not let a service worker take over, we navigate away and then come back to
   * reload. We do not `waitForLoad` on about:blank since a page load event is
   * never fired on it.
   * @param {!Driver} driver
   * @return {!Promise}
   */
  static loadBlank(driver) {
    return driver.gotoURL('about:blank')
      .then(_ => new Promise((resolve, reject) => setTimeout(resolve, 300)));
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
      .then(_ => options.config.trace && driver.beginTrace())
      // Network is always recorded for internal use, even if not saved as artifact.
      .then(_ => driver.beginNetworkCollect(options))
      // Navigate.
      .then(_ => driver.gotoURL(options.url, {
        waitForLoad: true,
        disableJavaScript: !!options.disableJavaScript
      }));
  }

  static setupDriver(driver, options) {
    log.log('status', 'Initializing…');
    // Enable emulation if required.
    return Promise.resolve(options.flags.mobile && driver.beginEmulation())
      .then(_ => {
        return driver.cleanAndDisableBrowserCaches();
      }).then(_ => {
        // Clears storage for origin.
        return driver.clearDataForOrigin(options.url);
      });
  }

  /**
   * Navigates to about:blank and calls beforePass() on gatherers before tracing
   * has started and before navigation to the target page.
   * @param {!Object} options
   * @return {!Promise}
   */
  static beforePass(options) {
    const pass = GatherRunner.loadBlank(options.driver);

    return options.config.gatherers.reduce((chain, gatherer) => {
      return chain.then(_ => {
        return gatherer.beforePass(options);
      });
    }, pass);
  }

  /**
   * Navigates to requested URL and then runs pass() on gatherers while trace
   * (if requested) is still being recorded.
   * @param {!Object} options
   * @return {!Promise}
   */
  static pass(options) {
    const driver = options.driver;
    const config = options.config;
    const gatherers = config.gatherers;
    let pass = Promise.resolve();

    if (config.loadPage) {
      pass = pass.then(_ => {
        const status = 'Loading page & waiting for onload';
        const gatherernames = gatherers.map(g => g.name).join(', ');
        log.log('status', status, gatherernames);
        return GatherRunner.loadPage(driver, options).then(_ => {
          log.log('statusEnd', status);
        });
      });
    }

    return gatherers.reduce((chain, gatherer) => {
      return chain.then(_ => gatherer.pass(options));
    }, pass);
  }

  /**
   * Ends tracing and collects trace data (if requested for this pass), and runs
   * afterPass() on gatherers with trace data passed in. Promise resolves with
   * object containing trace and network data.
   * @param {!Object} options
   * @return {!Promise}
   */
  static afterPass(options) {
    const driver = options.driver;
    const config = options.config;
    const gatherers = config.gatherers;
    const passData = {};

    let pass = Promise.resolve();

    if (config.trace) {
      pass = pass.then(_ => {
        log.log('status', 'Retrieving trace');
        return driver.endTrace();
      }).then(traceContents => {
        // Before Chrome 54.0.2816 (codereview.chromium.org/2161583004),
        // traceContents was an array of trace events; after, traceContents is
        // an object with a traceEvents property. Normalize to object form.
        passData.trace = Array.isArray(traceContents) ?
            {traceEvents: traceContents} : traceContents;
        log.verbose('statusEnd', 'Retrieving trace');
      });
    }

    const status = 'Retrieving network records';
    pass = pass.then(_ => {
      log.log('status', status);
      return driver.endNetworkCollect();
    }).then(networkRecords => {
      // Network records only given to gatherers if requested by config.
      config.network && (passData.networkRecords = networkRecords);
      log.verbose('statusEnd', status);
    });

    pass = gatherers.reduce((chain, gatherer) => {
      const status = `Retrieving: ${gatherer.name}`;
      return chain.then(_ => {
        log.log('status', status);
        return gatherer.afterPass(options, passData);
      }).then(ret => {
        log.verbose('statusEnd', status);
        return ret;
      });
    }, pass);

    // Resolve on tracing data using passName from config.
    return pass.then(_ => passData);
  }

  static run(passes, options) {
    const driver = options.driver;
    const tracingData = {
      traces: {},
      networkRecords: {}
    };

    if (typeof options.url !== 'string' || options.url.length === 0) {
      return Promise.reject(new Error('You must provide a url to the driver'));
    }

    if (typeof options.flags === 'undefined') {
      options.flags = {};
    }

    if (typeof options.config === 'undefined') {
      return Promise.reject(new Error('You must provide a config'));
    }

    // Default mobile emulation and page loading to true.
    // The extension will switch these off initially.
    if (typeof options.flags.mobile === 'undefined') {
      options.flags.mobile = true;
    }

    passes = this.instantiateGatherers(passes, options.config.configDir);

    return driver.connect()
      .then(_ => GatherRunner.setupDriver(driver, options))

      // Run each pass
      .then(_ => {
        // If the main document redirects, we'll update this to keep track
        let urlAfterRedirects;
        return passes.reduce((chain, config, passIndex) => {
          const runOptions = Object.assign({}, options, {config});
          return chain
            .then(_ => GatherRunner.beforePass(runOptions))
            .then(_ => GatherRunner.pass(runOptions))
            .then(_ => GatherRunner.afterPass(runOptions))
            .then(passData => {
              // If requested by config, merge trace and network data for this
              // pass into tracingData.
              const passName = config.passName || Audit.DEFAULT_PASS;
              config.trace && (tracingData.traces[passName] = passData.trace);
              config.network && (tracingData.networkRecords[passName] = passData.networkRecords);

              if (passIndex === 0) {
                urlAfterRedirects = runOptions.url;
              }
            });
        }, Promise.resolve()).then(_ => {
          options.url = urlAfterRedirects;
        });
      })
      .then(_ => {
        // We dont need to hold up the reporting for the reload/disconnect,
        // so we will not return a promise in here.
        driver.reloadForCleanStateIfNeeded(options).then(_ => {
          log.log('status', 'Disconnecting from browser...');
          driver.disconnect();
        });
      })
      .then(_ => {
        // Collate all the gatherer results.
        const computedArtifacts = this.instantiateComputedArtifacts();
        const artifacts = Object.assign({}, computedArtifacts, tracingData);

        passes.forEach(pass => {
          pass.gatherers.forEach(gatherer => {
            if (typeof gatherer.artifact === 'undefined') {
              throw new Error(`${gatherer.constructor.name} failed to provide an artifact.`);
            }

            artifacts[gatherer.name] = gatherer.artifact;
          });
        });
        return artifacts;
      });
  }

  static getGathererClass(gatherer, rootPath) {
    const Runner = require('../runner');
    const coreList = Runner.getGathererList();

    let GathererClass;

    // First see if it is a core gatherer in Lighthouse itself.
    const coreGatherer = coreList.find(a => a === `${gatherer}.js`);
    let requirePath = `./gatherers/${gatherer}`;

    // If not, see if it can be found another way.
    if (!coreGatherer) {
      // Firstly try and see if the gatherer resolves naturally through the usual means.
      try {
        require.resolve(gatherer);

        // If the above works, update the path to the absolute value provided.
        requirePath = gatherer;
      } catch (requireError) {
        // If that fails, try and find it relative to any config path provided.
        if (rootPath) {
          requirePath = path.resolve(rootPath, gatherer);
        }
      }
    }

    // Now try and require it in. If this fails then the audit file isn't where we expected it.
    try {
      GathererClass = require(requirePath);
    } catch (requireError) {
      GathererClass = null;
    }

    if (!GathererClass) {
      throw new Error(`Unable to locate gatherer: ${gatherer} (tried at: ${requirePath})`);
    }

    // Confirm that the gatherer appears valid.
    this.assertValidGatherer(gatherer, GathererClass);

    return GathererClass;
  }

  static assertValidGatherer(gatherer, GathererDefinition) {
    const gathererInstance = new GathererDefinition();

    if (typeof gathererInstance.beforePass !== 'function') {
      throw new Error(`${gatherer} has no beforePass() method.`);
    }

    if (typeof gathererInstance.pass !== 'function') {
      throw new Error(`${gatherer} has no pass() method.`);
    }

    if (typeof gathererInstance.afterPass !== 'function') {
      throw new Error(`${gatherer} has no afterPass() method.`);
    }

    if (typeof gathererInstance.artifact !== 'object') {
      throw new Error(`${gatherer} has no artifact property.`);
    }
  }

  static instantiateComputedArtifacts() {
    let computedArtifacts = {};
    require('fs').readdirSync(path.join(__dirname, 'computed')).forEach(function(file) {
      // Drop `.js` suffix to keep browserify import happy.
      file = file.replace(/\.js$/, '');
      const ArtifactClass = require('./computed/' + file);
      const artifact = new ArtifactClass();
      // define the request* function that will be exposed on `artifacts`
      computedArtifacts['request' + artifact.name] = function(artifacts) {
        return Promise.resolve(artifact.request(artifacts));
      };
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
