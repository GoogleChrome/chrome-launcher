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

class GatherRunner {
  static loadPage(driver, options) {
    // Since a Page.reload command does not let a service worker take over, we
    // navigate away and then come back to reload. We do not `waitForLoad` on
    // about:blank since a page load event is never fired on it.
    return driver.gotoURL('about:blank')
      // Wait a bit for about:blank to "take hold" before switching back to the page.
      .then(_ => new Promise((resolve, reject) => setTimeout(resolve, 300)))
      .then(_ => driver.gotoURL(options.url, {
        waitForLoad: true,
        disableJavaScript: !!options.disableJavaScript
      }));
  }

  static setupDriver(driver, gatherers, options) {
    log.log('status', 'Initializing…');
    return new Promise((resolve, reject) => {
      // Enable emulation.
      if (options.flags.mobile) {
        return resolve(driver.beginEmulation());
      }

      // noop if no mobile emulation
      resolve();
    }).then(_ => {
      return driver.cleanAndDisableBrowserCaches();
    }).then(_ => {
      // Force SWs to update on load.
      return driver.forceUpdateServiceWorkers();
    });
  }

  static setupPass(options) {
    const driver = options.driver;
    const config = options.config;
    let pass = Promise.resolve();

    if (config.trace) {
      pass = pass.then(_ => driver.beginTrace());
    }

    if (config.network) {
      pass = pass.then(_ => driver.beginNetworkCollect());
    }

    return pass;
  }

  static beforePass(options) {
    const config = options.config;
    const gatherers = config.gatherers;

    return gatherers.reduce((chain, gatherer) => {
      return chain.then(_ => {
        return gatherer.beforePass(options);
      });
    }, Promise.resolve());
  }

  static pass(options) {
    const driver = options.driver;
    const config = options.config;
    const gatherers = config.gatherers;
    const gatherernames = gatherers.map(g => g.name).join(', ');
    let pass = Promise.resolve();

    if (config.loadPage) {
      pass = pass.then(_ => {
        const status = 'Loading page & waiting for onload';
        log.log('status', status, gatherernames);
        return this.loadPage(driver, options).then(_ => {
          log.log('statusEnd', status);
        });
      });
    }

    return gatherers.reduce((chain, gatherer) => {
      return chain.then(_ => gatherer.pass(options));
    }, pass);
  }

  static afterPass(options) {
    const driver = options.driver;
    const config = options.config;
    const gatherers = config.gatherers;
    const loadData = {traces: {}};
    let pass = Promise.resolve();
    let traceName = Audit.DEFAULT_TRACE;
    if (config.traceName) {
      traceName = config.traceName;
    }

    if (config.trace) {
      pass = pass.then(_ => {
        log.log('status', 'Retrieving trace');
        return driver.endTrace().then(traceContents => {
          // Before Chrome 54.0.2816 (codereview.chromium.org/2161583004),
          // traceContents was an array of trace events. After this point,
          // traceContents is an object with a traceEvents property. Normalize
          // to new format.
          if (Array.isArray(traceContents)) {
            traceContents = {
              traceEvents: traceContents
            };
          }

          loadData.traces[traceName] = traceContents;
          loadData.traceEvents = traceContents.traceEvents;
          log.verbose('statusEnd', 'Retrieving trace');
        });
      });
    }

    if (config.network) {
      pass = pass.then(_ => {
        const status = 'Retrieving network records';
        log.log('status', status);
        return driver.endNetworkCollect().then(networkRecords => {
          loadData.networkRecords = networkRecords;
          log.verbose('statusEnd', status);
        });
      });
    }

    return gatherers
        .reduce((chain, gatherer) => {
          return chain.then(_ => {
            const status = `Retrieving: ${gatherer.name}`;
            log.log('status', status);
            return Promise.resolve(gatherer.afterPass(options, loadData)).then(ret => {
              log.verbose('statusEnd', status);
              return ret;
            });
          });
        }, pass)
        .then(_ => loadData);
  }

  static run(passes, options) {
    const driver = options.driver;
    const tracingData = {traces: {}};

    if (typeof options.url !== 'string' || options.url.length === 0) {
      return Promise.reject(new Error('You must provide a url to the driver'));
    }

    if (typeof options.flags === 'undefined') {
      options.flags = {};
    }

    // Default mobile emulation and page loading to true.
    // The extension will switch these off initially.
    if (typeof options.flags.mobile === 'undefined') {
      options.flags.mobile = true;
    }

    if (typeof options.flags.loadPage === 'undefined') {
      options.flags.loadPage = true;
    }

    passes = this.instantiateGatherers(passes);

    return driver.connect()
      .then(_ => this.setupDriver(driver, 1, options))

      // Run each pass
      .then(_ => {
        return passes.reduce((chain, config) => {
          const runOptions = Object.assign({}, options, {config});
          return chain
              .then(_ => this.setupPass(runOptions))
              .then(_ => this.beforePass(runOptions))
              .then(_ => this.pass(runOptions))
              .then(_ => this.afterPass(runOptions))
              .then(loadData => {
                // Merge pass trace and network data into tracingData.
                config.trace && Object.assign(tracingData.traces, loadData.traces);
                config.network && (tracingData.networkRecords = loadData.networkRecords);
              });
        }, Promise.resolve());
      })
      .then(_ => {
        // We dont need to hold up the reporting for the reload/disconnect,
        // so we will not return a promise in here.
        driver.reloadForCleanStateIfNeeded(options).then(_ => {
          log.log('status', 'Disconnecting from browser...');
          driver.disconnect();
        });
        return undefined;
      })
      .then(_ => {
        // Collate all the gatherer results.
        const artifacts = Object.assign({}, tracingData);
        passes.forEach(pass => {
          pass.gatherers.forEach(gatherer => {
            artifacts[gatherer.name] = gatherer.artifact;
          });
        });
        return artifacts;
      });
  }

  static getGathererClass(gatherer) {
    return require(`./gatherers/${gatherer}`);
  }

  static instantiateGatherers(passes) {
    return passes.map(pass => {
      pass.gatherers = pass.gatherers.map(gatherer => {
        // If this is already instantiated, don't do anything else.
        if (typeof gatherer !== 'string') {
          return gatherer;
        }

        const GathererClass = GatherRunner.getGathererClass(gatherer);
        return new GathererClass();
      });

      return pass;
    });
  }
}

module.exports = GatherRunner;
