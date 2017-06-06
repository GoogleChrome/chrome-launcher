/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const Gatherer = require('../../gather/gatherers/gatherer');
const GatherRunner = require('../../gather/gather-runner');
const assert = require('assert');
const Config = require('../../config/config');
const path = require('path');
const unresolvedPerfLog = require('./../fixtures/unresolved-perflog.json');

class TestGatherer extends Gatherer {
  constructor() {
    super();
    this.called = false;
  }

  pass() {
    this.called = true;
    return 'MyArtifact';
  }
}

class TestGathererNoArtifact extends Gatherer {
  beforePass() {}
  pass() {}
  afterPass() {}
}

const fakeDriver = require('./fake-driver');

function getMockedEmulationDriver(emulationFn, netThrottleFn, cpuThrottleFn, blockUrlFn) {
  const Driver = require('../../gather/driver');
  const Connection = require('../../gather/connections/connection');
  const EmulationDriver = class extends Driver {
    enableRuntimeEvents() {
      return Promise.resolve();
    }
    assertNoSameOriginServiceWorkerClients() {
      return Promise.resolve();
    }
    cacheNatives() {
      return Promise.resolve();
    }
    cleanBrowserCaches() {}
    clearDataForOrigin() {}
    getUserAgent() {
      return Promise.resolve('Fake user agent');
    }
  };
  const EmulationMock = class extends Connection {
    sendCommand(command, params) {
      let fn = null;
      switch (command) {
        case 'Network.emulateNetworkConditions':
          fn = netThrottleFn;
          break;
        case 'Emulation.setCPUThrottlingRate':
          fn = cpuThrottleFn;
          break;
        case 'Emulation.setDeviceMetricsOverride':
          fn = emulationFn;
          break;
        case 'Network.setBlockedURLs':
          fn = blockUrlFn;
          break;
        default:
          fn = null;
          break;
      }
      return Promise.resolve(fn && fn(params));
    }
  };
  return new EmulationDriver(new EmulationMock());
}

describe('GatherRunner', function() {
  it('loads a page and updates URL on redirect', () => {
    const url1 = 'https://example.com';
    const url2 = 'https://example.com/interstitial';
    const driver = {
      gotoURL() {
        return Promise.resolve(url2);
      },
    };

    const options = {
      url: url1,
      flags: {},
      config: {}
    };

    return GatherRunner.loadPage(driver, options).then(_ => {
      assert.equal(options.url, url2);
    });
  });

  it('creates flags if needed', () => {
    const url = 'https://example.com';
    const driver = fakeDriver;
    const config = new Config({});
    const options = {url, driver, config};

    return GatherRunner.run([], options).then(_ => {
      assert.equal(typeof options.flags, 'object');
    });
  });

  it('collects user agent as an artifact', () => {
    const url = 'https://example.com';
    const driver = fakeDriver;
    const config = new Config({});
    const options = {url, driver, config};

    return GatherRunner.run([], options).then(results => {
      assert.equal(results.UserAgent, 'Fake user agent', 'did not find expected user agent string');
    });
  });

  it('sets up the driver to begin emulation when all emulation flags are undefined', () => {
    const tests = {
      calledDeviceEmulation: false,
      calledNetworkEmulation: false,
      calledCpuEmulation: false,
    };
    const createEmulationCheck = variable => () => {
      tests[variable] = true;

      return true;
    };
    const driver = getMockedEmulationDriver(
      createEmulationCheck('calledDeviceEmulation'),
      createEmulationCheck('calledNetworkEmulation'),
      createEmulationCheck('calledCpuEmulation')
    );

    return GatherRunner.setupDriver(driver, {}, {
      flags: {}
    }).then(_ => {
      assert.equal(tests.calledDeviceEmulation, true);
      assert.equal(tests.calledNetworkEmulation, true);
      assert.equal(tests.calledCpuEmulation, true);
    });
  });

  it('stops device emulation when disableDeviceEmulation flag is true', () => {
    const tests = {
      calledDeviceEmulation: false,
      calledNetworkEmulation: false,
      calledCpuEmulation: false,
    };
    const createEmulationCheck = variable => () => {
      tests[variable] = true;
      return true;
    };
    const driver = getMockedEmulationDriver(
      createEmulationCheck('calledDeviceEmulation', false),
      createEmulationCheck('calledNetworkEmulation', true),
      createEmulationCheck('calledCpuEmulation', true)
    );

    return GatherRunner.setupDriver(driver, {}, {
      flags: {
        disableDeviceEmulation: true,
      }
    }).then(_ => {
      assert.equal(tests.calledDeviceEmulation, false);
      assert.equal(tests.calledNetworkEmulation, true);
      assert.equal(tests.calledCpuEmulation, true);
    });
  });

  it('stops network throttling when disableNetworkThrottling flag is true', () => {
    const tests = {
      calledDeviceEmulation: false,
      calledNetworkEmulation: false,
      calledCpuEmulation: false,
    };
    const createEmulationCheck = variable => (...args) => {
      tests[variable] = args;
      return true;
    };
    const driver = getMockedEmulationDriver(
      createEmulationCheck('calledDeviceEmulation'),
      createEmulationCheck('calledNetworkEmulation'),
      createEmulationCheck('calledCpuEmulation')
    );

    return GatherRunner.setupDriver(driver, {}, {
      flags: {
        disableNetworkThrottling: true,
      }
    }).then(_ => {
      assert.ok(tests.calledDeviceEmulation, 'called device emulation');
      assert.deepEqual(tests.calledNetworkEmulation, [{
        latency: 0, downloadThroughput: 0, uploadThroughput: 0, offline: false
      }]);
      assert.ok(tests.calledCpuEmulation, 'called CPU emulation');
    });
  });

  it('stops cpu throttling when disableCpuThrottling flag is true', () => {
    const tests = {
      calledDeviceEmulation: false,
      calledNetworkEmulation: false,
      calledCpuEmulation: false,
    };
    const createEmulationCheck = variable => (...args) => {
      tests[variable] = args;
      return true;
    };
    const driver = getMockedEmulationDriver(
      createEmulationCheck('calledDeviceEmulation'),
      createEmulationCheck('calledNetworkEmulation'),
      createEmulationCheck('calledCpuEmulation')
    );

    return GatherRunner.setupDriver(driver, {}, {
      flags: {
        disableCpuThrottling: true,
      }
    }).then(_ => {
      assert.ok(tests.calledDeviceEmulation, 'called device emulation');
      assert.ok(tests.calledNetworkEmulation, 'called network emulation');
      assert.deepEqual(tests.calledCpuEmulation, [{rate: 1}]);
    });
  });

  it('clears origin storage', () => {
    const asyncFunc = () => Promise.resolve();
    const tests = {
      calledCleanBrowserCaches: false,
      calledClearStorage: false,
    };
    const createCheck = variable => () => {
      tests[variable] = true;
      return Promise.resolve();
    };
    const driver = {
      assertNoSameOriginServiceWorkerClients: asyncFunc,
      beginEmulation: asyncFunc,
      setThrottling: asyncFunc,
      dismissJavaScriptDialogs: asyncFunc,
      enableRuntimeEvents: asyncFunc,
      cacheNatives: asyncFunc,
      cleanBrowserCaches: createCheck('calledCleanBrowserCaches'),
      clearDataForOrigin: createCheck('calledClearStorage'),
      blockUrlPatterns: asyncFunc,
      getUserAgent: asyncFunc,
    };

    return GatherRunner.setupDriver(driver, {}, {flags: {}}).then(_ => {
      assert.equal(tests.calledCleanBrowserCaches, false);
      assert.equal(tests.calledClearStorage, true);
    });
  });

  it('clears the disk & memory cache on a perf run', () => {
    const asyncFunc = () => Promise.resolve();
    const tests = {
      calledCleanBrowserCaches: false
    };
    const createCheck = variable => () => {
      tests[variable] = true;
      return Promise.resolve();
    };
    const driver = {
      beginDevtoolsLog: asyncFunc,
      beginTrace: asyncFunc,
      gotoURL: asyncFunc,
      cleanBrowserCaches: createCheck('calledCleanBrowserCaches')
    };
    const config = {
      recordTrace: true,
      useThrottling: true,
      gatherers: []
    };
    const flags = {
      disableStorageReset: false
    };
    return GatherRunner.pass({driver, config, flags}, {TestGatherer: []}).then(_ => {
      assert.equal(tests.calledCleanBrowserCaches, true);
    });
  });

  it('does not clear origin storage with flag --disable-storage-reset', () => {
    const asyncFunc = () => Promise.resolve();
    const tests = {
      calledCleanBrowserCaches: false,
      calledClearStorage: false,
    };
    const createCheck = variable => () => {
      tests[variable] = true;
      return Promise.resolve();
    };
    const driver = {
      assertNoSameOriginServiceWorkerClients: asyncFunc,
      beginEmulation: asyncFunc,
      setThrottling: asyncFunc,
      dismissJavaScriptDialogs: asyncFunc,
      enableRuntimeEvents: asyncFunc,
      cacheNatives: asyncFunc,
      cleanBrowserCaches: createCheck('calledCleanBrowserCaches'),
      clearDataForOrigin: createCheck('calledClearStorage'),
      blockUrlPatterns: asyncFunc,
      getUserAgent: asyncFunc,
    };

    return GatherRunner.setupDriver(driver, {}, {
      flags: {disableStorageReset: true}
    }).then(_ => {
      assert.equal(tests.calledCleanBrowserCaches, false);
      assert.equal(tests.calledClearStorage, false);
    });
  });

  it('tells the driver to block given URL patterns when blockedUrlPatterns is given', () => {
    let receivedUrlPatterns = null;
    const driver = getMockedEmulationDriver(null, null, null, params => {
      receivedUrlPatterns = params.urls;
    });

    return GatherRunner.beforePass({
      driver,
      flags: {
        blockedUrlPatterns: ['http://*.evil.com', '.jpg', '.woff2'],
      },
      config: {
        blockedUrlPatterns: ['*.jpeg'],
        gatherers: [],
      },
    }).then(() => assert.deepStrictEqual(
      receivedUrlPatterns.sort(),
      ['*.jpeg', '.jpg', '.woff2', 'http://*.evil.com']
    ));
  });

  it('does not throw when blockedUrlPatterns is not given', () => {
    let receivedUrlPatterns = null;
    const driver = getMockedEmulationDriver(null, null, null, params => {
      receivedUrlPatterns = params.urls;
    });

    return GatherRunner.beforePass({
      driver,
      flags: {},
      config: {gatherers: []},
    }).then(() => assert.deepStrictEqual(receivedUrlPatterns, []));
  });

  it('tells the driver to begin tracing', () => {
    let calledTrace = false;
    const driver = {
      beginTrace() {
        calledTrace = true;
        return Promise.resolve();
      },
      beginDevtoolsLog() {
        return Promise.resolve();
      },
      gotoURL() {
        return Promise.resolve();
      },
    };

    const config = {
      recordTrace: true,
      gatherers: [
        new TestGatherer()
      ]
    };
    const flags = {};

    return GatherRunner.pass({driver, config, flags}, {TestGatherer: []}).then(_ => {
      assert.equal(calledTrace, true);
    });
  });

  it('tells the driver to end tracing', () => {
    const url = 'https://example.com';
    let calledTrace = false;
    const fakeTraceData = {traceEvents: ['reallyBelievableTraceEvents']};

    const driver = Object.assign({}, fakeDriver, {
      endTrace() {
        calledTrace = true;
        return Promise.resolve(fakeTraceData);
      }
    });

    const config = {
      recordTrace: true,
      gatherers: [
        new TestGatherer()
      ]
    };

    return GatherRunner.afterPass({url, driver, config}, {TestGatherer: []}).then(passData => {
      assert.equal(calledTrace, true);
      assert.equal(passData.trace, fakeTraceData);
    });
  });

  it('tells the driver to begin devtoolsLog collection', () => {
    let calledDevtoolsLogCollect = false;
    const driver = {
      beginDevtoolsLog() {
        calledDevtoolsLogCollect = true;
        return Promise.resolve();
      },
      gotoURL() {
        return Promise.resolve();
      }
    };

    const config = {
      gatherers: [
        new TestGatherer()
      ]
    };
    const flags = {};

    return GatherRunner.pass({driver, config, flags}, {TestGatherer: []}).then(_ => {
      assert.equal(calledDevtoolsLogCollect, true);
    });
  });

  it('tells the driver to end devtoolsLog collection', () => {
    const url = 'https://example.com';
    let calledDevtoolsLogCollect = false;

    const fakeDevtoolsMessage = {method: 'Network.FakeThing', params: {}};
    const driver = Object.assign({}, fakeDriver, {
      endDevtoolsLog() {
        calledDevtoolsLogCollect = true;
        return [
          fakeDevtoolsMessage
        ];
      }
    });

    const config = {
      gatherers: [
        new TestGatherer()
      ]
    };

    return GatherRunner.afterPass({url, driver, config}, {TestGatherer: []}).then(vals => {
      assert.equal(calledDevtoolsLogCollect, true);
      assert.strictEqual(vals.devtoolsLog[0], fakeDevtoolsMessage);
    });
  });

  it('rejects when not given a URL', () => {
    return GatherRunner.run({}, {}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('rejects when given a URL of zero length', () => {
    return GatherRunner.run({}, {url: ''}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('rejects when not given a config', () => {
    return GatherRunner.run({}, {url: 'http://example.com'})
        .then(_ => assert.ok(false), err => {
          assert.ok(/config/i.test(err));
        });
  });

  it('does as many passes as are required', () => {
    const t1 = new TestGatherer();
    const t2 = new TestGatherer();
    const config = new Config({});
    const flags = {};

    const passes = [{
      blankDuration: 0,
      recordTrace: true,
      passName: 'firstPass',
      gatherers: [
        t1
      ]
    }, {
      blankDuration: 0,
      passName: 'secondPass',
      gatherers: [
        t2
      ]
    }];

    return GatherRunner.run(passes, {
      driver: fakeDriver,
      url: 'https://example.com',
      flags,
      config
    }).then(_ => {
      assert.ok(t1.called);
      assert.ok(t2.called);
    });
  });

  it('respects trace names', () => {
    const passes = [{
      blankDuration: 0,
      recordTrace: true,
      passName: 'firstPass',
      gatherers: [new TestGatherer()]
    }, {
      blankDuration: 0,
      recordTrace: true,
      passName: 'secondPass',
      gatherers: [new TestGatherer()]
    }];
    const options = {driver: fakeDriver, url: 'https://example.com', flags: {}, config: {}};

    return GatherRunner.run(passes, options)
      .then(artifacts => {
        assert.ok(artifacts.traces.firstPass);
        assert.ok(artifacts.devtoolsLogs.firstPass);
        assert.ok(artifacts.traces.secondPass);
        assert.ok(artifacts.devtoolsLogs.secondPass);
      });
  });

  it('doesn\'t leave networkRecords as an artifact', () => {
    const passes = [{
      blankDuration: 0,
      recordTrace: true,
      passName: 'firstPass',
      gatherers: [new TestGatherer()]
    }, {
      blankDuration: 0,
      recordTrace: true,
      passName: 'secondPass',
      gatherers: [new TestGatherer()]
    }];
    const options = {driver: fakeDriver, url: 'https://example.com', flags: {}, config: {}};

    return GatherRunner.run(passes, options)
      .then(artifacts => {
        // todo, trash these
        assert.equal(artifacts.networkRecords['firstPass'], undefined);
        assert.equal(artifacts.networkRecords['secondPass'], undefined);
      });
  });


  it('loads gatherers from custom paths', () => {
    const root = path.resolve(__dirname, '../fixtures');

    assert.doesNotThrow(_ => GatherRunner.getGathererClass(`${root}/valid-custom-gatherer`));
    return assert.doesNotThrow(_ => GatherRunner.getGathererClass('valid-custom-gatherer', root));
  });

  it('returns gatherer when gatherer class, not package-name string, is provided', () => {
    assert.equal(GatherRunner.getGathererClass(TestGatherer, '.'), TestGatherer);
  });

  it('throws when a gatherer is not found', () => {
    return assert.throws(_ => GatherRunner.getGathererClass(
        '/fake-path/non-existent-gatherer'), /locate gatherer/);
  });

  it('loads a gatherer relative to a config path', () => {
    const configPath = __dirname;

    return assert.doesNotThrow(_ =>
        GatherRunner.getGathererClass('../fixtures/valid-custom-gatherer', configPath));
  });

  it('loads a gatherer from node_modules/', () => {
    return assert.throws(_ => GatherRunner.getGathererClass(
        // Use a lighthouse dep as a stand in for a module.
        'mocha'
    ), function(err) {
      // Should throw a gatherer validation error, but *not* a gatherer not found error.
      return !/locate gatherer/.test(err) && /beforePass\(\) method/.test(err);
    });
  });

  it('loads a gatherer relative to the working directory', () => {
    // Construct a gatherer URL relative to current working directory,
    // regardless of where test was started from.
    const absoluteGathererPath = path.resolve(__dirname, '../fixtures/valid-custom-gatherer');
    assert.doesNotThrow(_ => require.resolve(absoluteGathererPath));
    const relativeGathererPath = path.relative(process.cwd(), absoluteGathererPath);

    return assert.doesNotThrow(_ =>
        GatherRunner.getGathererClass(relativeGathererPath));
  });

  it('throws but not for missing gatherer when it has a dependency error', () => {
    const gathererPath = path.resolve(__dirname, '../fixtures/invalid-gatherers/require-error.js');
    return assert.throws(_ => GatherRunner.getGathererClass(gathererPath),
        function(err) {
          // We're expecting not to find parent class Gatherer, so only reject on
          // our own custom locate gatherer error, not the usual MODULE_NOT_FOUND.
          return !/locate gatherer/.test(err) && err.code === 'MODULE_NOT_FOUND';
        });
  });

  it('throws for invalid gatherers', () => {
    const root = path.resolve(__dirname, '../fixtures/invalid-gatherers');

    assert.throws(_ => GatherRunner.getGathererClass('missing-before-pass', root),
      /beforePass\(\) method/);

    assert.throws(_ => GatherRunner.getGathererClass('missing-pass', root),
      /pass\(\) method/);

    assert.throws(_ => GatherRunner.getGathererClass('missing-after-pass', root),
      /afterPass\(\) method/);
  });

  describe('#assertPageLoaded', () => {
    it('passes when the page is loaded', () => {
      const url = 'http://the-page.com';
      const records = [{url}];
      GatherRunner.assertPageLoaded(url, {online: true}, records);
    });

    it('passes when the page is loaded, ignoring any fragment', () => {
      const url = 'http://example.com/#/page/list';
      const records = [{url: 'http://example.com'}];
      GatherRunner.assertPageLoaded(url, {online: true}, records);
    });

    it('throws when page fails to load', () => {
      const url = 'http://the-page.com';
      const records = [{url, failed: true, localizedFailDescription: 'foobar'}];
      assert.throws(() => {
        GatherRunner.assertPageLoaded(url, {online: true}, records);
      }, /Unable.*foobar/);
    });

    it('throws when page times out', () => {
      const url = 'http://the-page.com';
      const records = [];
      assert.throws(() => {
        GatherRunner.assertPageLoaded(url, {online: true}, records);
      }, /Unable.*timeout/);
    });
  });

  describe('artifact collection', () => {
    it('supports sync and async return of artifacts from gatherers', () => {
      const gatherers = [
        // sync
        new class BeforeSync extends Gatherer {
          beforePass() {
            return this.name;
          }
        }(),
        new class PassSync extends Gatherer {
          pass() {
            return this.name;
          }
        }(),
        new class AfterSync extends Gatherer {
          afterPass() {
            return this.name;
          }
        }(),

        // async
        new class BeforePromise extends Gatherer {
          beforePass() {
            return Promise.resolve(this.name);
          }
        }(),
        new class PassPromise extends Gatherer {
          pass() {
            return Promise.resolve(this.name);
          }
        }(),
        new class AfterPromise extends Gatherer {
          afterPass() {
            return Promise.resolve(this.name);
          }
        }()
      ];
      const gathererNames = gatherers.map(gatherer => gatherer.name);
      const passes = [{
        blankDuration: 0,
        gatherers
      }];

      return GatherRunner.run(passes, {
        driver: fakeDriver,
        url: 'https://example.com',
        flags: {},
        config: new Config({})
      }).then(artifacts => {
        gathererNames.forEach(gathererName => {
          assert.strictEqual(artifacts[gathererName], gathererName);
        });
      });
    });

    it('uses the last not-undefined phase result as artifact', () => {
      const recoverableError = new Error('My recoverable error');
      const someOtherError = new Error('Bad, bad error.');

      // Gatherer results are all expected to be arrays of promises
      const gathererResults = {
        // 97 wins.
        AfterGatherer: [
          Promise.resolve(65),
          Promise.resolve(72),
          Promise.resolve(97)
        ],

        // 284 wins.
        PassGatherer: [
          Promise.resolve(220),
          Promise.resolve(284),
          Promise.resolve(undefined)
        ],

        // Error wins.
        SingleErrorGatherer: [
          Promise.reject(recoverableError),
          Promise.resolve(1184),
          Promise.resolve(1210)
        ],

        // First error wins.
        TwoErrorGatherer: [
          Promise.reject(recoverableError),
          Promise.reject(someOtherError),
          Promise.resolve(1729)
        ]
      };

      return GatherRunner.collectArtifacts(gathererResults).then(artifacts => {
        assert.strictEqual(artifacts.AfterGatherer, 97);
        assert.strictEqual(artifacts.PassGatherer, 284);
        assert.strictEqual(artifacts.SingleErrorGatherer, recoverableError);
        assert.strictEqual(artifacts.TwoErrorGatherer, recoverableError);
      });
    });

    it('supports sync and async throwing of non-fatal errors from gatherers', () => {
      const gatherers = [
        // sync
        new class BeforeSync extends Gatherer {
          beforePass() {
            throw new Error(this.name);
          }
        }(),
        new class PassSync extends Gatherer {
          pass() {
            throw new Error(this.name);
          }
        }(),
        new class AfterSync extends Gatherer {
          afterPass() {
            throw new Error(this.name);
          }
        }(),

        // async
        new class BeforePromise extends Gatherer {
          beforePass() {
            const err = new Error(this.name);
            return Promise.reject(err);
          }
        }(),
        new class PassPromise extends Gatherer {
          pass() {
            const err = new Error(this.name);
            return Promise.reject(err);
          }
        }(),
        new class AfterPromise extends Gatherer {
          afterPass() {
            const err = new Error(this.name);
            return Promise.reject(err);
          }
        }()
      ];
      const gathererNames = gatherers.map(gatherer => gatherer.name);
      const passes = [{
        blankDuration: 0,
        gatherers
      }];

      return GatherRunner.run(passes, {
        driver: fakeDriver,
        url: 'https://example.com',
        flags: {},
        config: new Config({})
      }).then(artifacts => {
        gathererNames.forEach(gathererName => {
          const errorArtifact = artifacts[gathererName];
          assert.ok(errorArtifact instanceof Error);
          assert.strictEqual(errorArtifact.message, gathererName);
        });
      });
    });

    it('rejects if a gatherer returns a fatal error', () => {
      const errorMessage = 'Gather Failed in pass()';
      const err = new Error(errorMessage);
      err.fatal = true;
      const gatherers = [
        // sync
        new class GathererSuccess extends Gatherer {
          afterPass() {
            return 1;
          }
        }(),
        new class GathererFailure extends Gatherer {
          pass() {
            return Promise.reject(err);
          }
        }
      ];
      const passes = [{
        blankDuration: 0,
        gatherers
      }];

      return GatherRunner.run(passes, {
        driver: fakeDriver,
        url: 'https://example.com',
        flags: {},
        config: new Config({})
      }).then(
        _ => assert.ok(false),
        err => assert.strictEqual(err.message, errorMessage));
    });

    it('rejects if a gatherer does not provide an artifact', () => {
      const passes = [{
        blankDuration: 0,
        recordTrace: true,
        passName: 'firstPass',
        gatherers: [
          new TestGathererNoArtifact()
        ]
      }];

      return GatherRunner.run(passes, {
        driver: fakeDriver,
        url: 'https://example.com',
        flags: {},
        config: new Config({})
      }).then(_ => assert.ok(false), _ => assert.ok(true));
    });

    it('rejects when domain name can\'t be resolved', () => {
      const passes = [{
        blankDuration: 0,
        recordTrace: true,
        passName: 'firstPass',
        gatherers: []
      }];

      // Arrange for driver to return unresolved request.
      const url = 'http://www.some-non-existing-domain.com/';
      const unresolvedDriver = Object.assign({}, fakeDriver, {
        online: true,
        gotoURL() {
          return Promise.resolve(url);
        },
        endDevtoolsLog() {
          return unresolvedPerfLog;
        },
      });

      return GatherRunner.run(passes, {
        driver: unresolvedDriver,
        url,
        flags: {},
        config: new Config({})
      })
        .then(_ => {
          assert.ok(false);
        }, error => {
          assert.ok(true);
          assert.ok(/net::ERR_NAME_NOT_RESOLVED/.test(error.message));
        });
    });

    it('resolves when domain name can\'t be resolved but is offline', () => {
      const passes = [{
        blankDuration: 0,
        recordTrace: true,
        passName: 'firstPass',
        gatherers: []
      }];

      // Arrange for driver to return unresolved request.
      const url = 'http://www.some-non-existing-domain.com/';
      const unresolvedDriver = Object.assign({}, fakeDriver, {
        online: false,
        gotoURL() {
          return Promise.resolve(url);
        },
        endDevtoolsLog() {
          return unresolvedPerfLog;
        }
      });

      return GatherRunner.run(passes, {
        driver: unresolvedDriver,
        url,
        flags: {},
        config: new Config({})
      })
        .then(_ => {
          assert.ok(true);
        });
    });
  });
});
