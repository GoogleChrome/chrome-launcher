/**
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

/* eslint-env mocha */

const Gatherer = require('../../gather/gatherers/gatherer');
const GatherRunner = require('../../gather/gather-runner');
const assert = require('assert');
const Config = require('../../config/config');
const path = require('path');

class TestGatherer extends Gatherer {
  constructor() {
    super();
    this.called = false;
  }

  get name() {
    return 'test';
  }

  pass() {
    this.called = true;
  }
}

class TestGathererNoArtifact {
  beforePass() {}
  pass() {}
  afterPass() {}
}

const fakeDriver = require('./fake-driver');

function getMockedEmulationDriver(emulationFn, netThrottleFn, cpuThrottleFn) {
  const Driver = require('../../gather/driver');
  const Connection = require('../../gather/connections/connection');
  const EmulationDriver = class extends Driver {
    enableRuntimeEvents() {
      return Promise.resolve();
    }
    cleanAndDisableBrowserCaches() {}
    clearDataForOrigin() {}
  };
  const EmulationMock = class extends Connection {
    sendCommand(command) {
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
        default:
          fn = null;
          break;
      }
      return Promise.resolve(fn && fn());
    }
  };
  return new EmulationDriver(new EmulationMock());
}

describe('GatherRunner', function() {
  it('loads a page', () => {
    const driver = {
      gotoURL() {
        return Promise.resolve(true);
      },
      beginNetworkCollect() {
        return Promise.resolve();
      }
    };

    return GatherRunner.loadPage(driver, {
      flags: {},
      config: {}
    }).then(res => {
      assert.equal(res, true);
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

    return GatherRunner.setupDriver(driver, {
      flags: {}
    }).then(_ => {
      assert.equal(tests.calledDeviceEmulation, true);
      assert.equal(tests.calledNetworkEmulation, true);
      assert.equal(tests.calledCpuEmulation, true);
    });
  });

  it(`sets up the driver to stop device emulation when
  disableDeviceEmulation flag is true`, () => {
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

    return GatherRunner.setupDriver(driver, {
      flags: {
        disableDeviceEmulation: true,
      }
    }).then(_ => {
      assert.equal(tests.calledDeviceEmulation, false);
      assert.equal(tests.calledNetworkEmulation, true);
      assert.equal(tests.calledCpuEmulation, true);
    });
  });

  it(`sets up the driver to stop network throttling when
  disableNetworkThrottling flag is true`, () => {
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

    return GatherRunner.setupDriver(driver, {
      flags: {
        disableNetworkThrottling: true,
      }
    }).then(_ => {
      assert.equal(tests.calledDeviceEmulation, true);
      assert.equal(tests.calledNetworkEmulation, false);
      assert.equal(tests.calledCpuEmulation, true);
    });
  });

  it(`sets up the driver to stop cpu throttling when
  disableCpuThrottling flag is true`, () => {
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

    return GatherRunner.setupDriver(driver, {
      flags: {
        disableCpuThrottling: true,
      }
    }).then(_ => {
      assert.equal(tests.calledDeviceEmulation, true);
      assert.equal(tests.calledNetworkEmulation, true);
      assert.equal(tests.calledCpuEmulation, false);
    });
  });

  it('tells the driver to begin tracing', () => {
    let calledTrace = false;
    const driver = {
      beginTrace() {
        calledTrace = true;
        return Promise.resolve();
      },
      gotoURL() {
        return Promise.resolve();
      },
      beginNetworkCollect() {
        return Promise.resolve();
      }
    };

    const config = {
      recordTrace: true,
      gatherers: [{}]
    };

    return GatherRunner.loadPage(driver, {config}).then(_ => {
      assert.equal(calledTrace, true);
    });
  });

  it('tells the driver to end tracing', () => {
    let calledTrace = false;
    const fakeTraceData = {traceEvents: ['reallyBelievableTraceEvents']};
    const driver = {
      endTrace() {
        calledTrace = true;
        return Promise.resolve(fakeTraceData);
      },
      endNetworkCollect() {
        return Promise.resolve();
      }
    };

    const config = {
      recordTrace: true,
      gatherers: [{
        afterPass() {}
      }]
    };

    return GatherRunner.afterPass({driver, config}).then(passData => {
      assert.equal(calledTrace, true);
      assert.equal(passData.trace, fakeTraceData);
    });
  });

  it('tells the driver to begin network collection', () => {
    let calledNetworkCollect = false;
    const driver = {
      beginNetworkCollect() {
        calledNetworkCollect = true;
        return Promise.resolve();
      },
      gotoURL() {
        return Promise.resolve();
      }
    };

    const config = {
      recordNetwork: true,
      gatherers: [{}]
    };

    return GatherRunner.loadPage(driver, {config}).then(_ => {
      assert.equal(calledNetworkCollect, true);
    });
  });

  it('tells the driver to end network collection', () => {
    let calledNetworkCollect = false;
    const driver = {
      endNetworkCollect() {
        calledNetworkCollect = true;
        return Promise.resolve({x: 1});
      }
    };

    const config = {
      recordNetwork: true,
      gatherers: [{
        afterPass() {}
      }]
    };

    return GatherRunner.afterPass({driver, config}).then(vals => {
      assert.equal(calledNetworkCollect, true);
      assert.deepEqual(vals.networkRecords, {x: 1});
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
      recordNetwork: true,
      recordTrace: true,
      passName: 'firstPass',
      gatherers: [
        t1
      ]
    }, {
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
    }, _ => {
      assert.ok(false);
    });
  });

  it('respects trace names', () => {
    const passes = [{
      recordNetwork: true,
      recordTrace: true,
      passName: 'firstPass',
      gatherers: [new TestGatherer()]
    }, {
      recordNetwork: true,
      recordTrace: true,
      passName: 'secondPass',
      gatherers: [new TestGatherer()]
    }];
    const options = {driver: fakeDriver, url: 'https://example.com', flags: {}, config: {}};

    return GatherRunner.run(passes, options)
      .then(artifacts => {
        assert.ok(artifacts.traces.firstPass);
        assert.ok(artifacts.networkRecords.firstPass);
        assert.ok(artifacts.traces.secondPass);
        assert.ok(artifacts.networkRecords.secondPass);
      });
  });

  it('rejects if an audit does not provide an artifact', () => {
    const t1 = new TestGathererNoArtifact();
    const config = new Config({});
    const flags = {};

    const passes = [{
      recordNetwork: true,
      recordTrace: true,
      passName: 'firstPass',
      gatherers: [
        t1
      ]
    }];

    return GatherRunner.run(passes, {
      driver: fakeDriver,
      url: 'https://example.com',
      flags,
      config
    }).then(_ => assert.ok(false), _ => assert.ok(true));
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

    return assert.throws(_ => GatherRunner.getGathererClass('missing-artifact', root),
      /artifact property/);
  });

  it('can create computed artifacts', () => {
    const computedArtifacts = GatherRunner.instantiateComputedArtifacts();
    assert.ok(Object.keys(computedArtifacts).length, 'there are a few computed artifacts');
    Object.keys(computedArtifacts).forEach(artifactRequest => {
      assert.equal(typeof computedArtifacts[artifactRequest], 'function');
    });
  });

  it('will instantiate computed artifacts during a run', () => {
    const passes = [{
      recordNetwork: true,
      recordTrace: true,
      passName: 'firstPass',
      gatherers: [new TestGatherer()]
    }];
    const options = {driver: fakeDriver, url: 'https://example.com', flags: {}, config: {}};

    return GatherRunner.run(passes, options)
        .then(artifacts => {
          const networkRecords = artifacts.networkRecords.firstPass;
          const p = artifacts.requestCriticalRequestChains(networkRecords);
          return p.then(chains => {
            // fakeDriver will include networkRecords built from fixtures/perflog.json
            assert.ok(chains['93149.1']);
            assert.ok(chains['93149.1'].request);
            assert.ok(chains['93149.1'].children);
          });
        });
  });
});
