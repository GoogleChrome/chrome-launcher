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
const Audit = require('../../audits/audit');
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

describe('GatherRunner', function() {
  it('loads a page', () => {
    const driver = {
      gotoURL() {
        return Promise.resolve(true);
      }
    };

    return GatherRunner.loadPage(driver, {
      flags: {
        loadPage: true
      },
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

  it('reloads a page via about:blank', () => {
    const expected = [
      'https://example.com',
      'about:blank'
    ];
    const driver = {
      gotoURL(url) {
        assert(url, expected.pop());
        return Promise.resolve(true);
      }
    };

    return GatherRunner.loadPage(driver, {
      url: 'https://example.com',
      config: {}
    }).then(res => {
      assert.equal(res, true);
    });
  });

  it('sets up the driver to begin emulation when mobile == true', () => {
    let calledEmulation = false;
    const driver = {
      beginEmulation() {
        calledEmulation = true;
      },
      cleanAndDisableBrowserCaches() {},
      forceUpdateServiceWorkers() {}
    };

    return GatherRunner.setupDriver(driver, {
      flags: {
        mobile: true
      }
    }).then(_ => {
      assert.equal(calledEmulation, true);
    });
  });

  it('does not set up the driver to begin emulation when mobile == false', () => {
    let calledEmulation = false;
    const driver = {
      beginEmulation() {
        calledEmulation = true;
      },
      cleanAndDisableBrowserCaches() {},
      forceUpdateServiceWorkers() {}
    };

    return GatherRunner.setupDriver(driver, {
      flags: {}
    }).then(_ => {
      assert.equal(calledEmulation, false);
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
      }
    };

    const config = {
      trace: true,
      gatherers: [{}]
    };

    return GatherRunner.loadPage(driver, {config}).then(_ => {
      assert.equal(calledTrace, true);
    });
  });

  it('tells the driver to end tracing', () => {
    let calledTrace = false;
    const driver = {
      endTrace() {
        calledTrace = true;
        return Promise.resolve({x: 1});
      }
    };

    const config = {
      trace: true,
      gatherers: [{
        afterPass() {}
      }]
    };

    return GatherRunner.afterPass({driver, config}).then(vals => {
      assert.equal(calledTrace, true);
      assert.deepEqual(vals.traces[Audit.DEFAULT_TRACE], {x: 1});
    });
  });

  it('respects trace names', () => {
    const driver = {
      endTrace() {
        return Promise.resolve({x: 1});
      }
    };

    const config = {
      trace: true,
      traceName: 'notTheDefaultPass',
      gatherers: [{
        afterPass() {}
      }]
    };

    return GatherRunner.afterPass({driver, config}).then(vals => {
      assert.deepEqual(vals.traces.notTheDefaultPass, {x: 1});
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
      network: true,
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
      network: true,
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
      network: true,
      trace: true,
      traceName: 'firstPass',
      loadPage: true,
      gatherers: [
        t1
      ]
    }, {
      loadPage: true,
      traceName: 'secondPass',
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

  it('rejects if an audit does not provide an artifact', () => {
    const t1 = new TestGathererNoArtifact();
    const config = new Config({});
    const flags = {};

    const passes = [{
      network: true,
      trace: true,
      traceName: 'firstPass',
      loadPage: true,
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
});
