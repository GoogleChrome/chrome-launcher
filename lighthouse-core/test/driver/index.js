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

const Gather = require('../../driver/gatherers/gather');
const Driver = require('../../driver');
const assert = require('assert');

class TestGatherer extends Gather {
  constructor() {
    super();
    this.called = false;
  }

  get name() {
    return 'test';
  }

  setup() {
    this.called = true;
  }
}

const fakeDriver = require('./fake-driver');

describe('Driver', function() {
  it('loads a page', () => {
    const driver = {
      gotoURL() {
        return Promise.resolve(true);
      }
    };

    return Driver.loadPage(driver, {}, {
      flags: {
        loadPage: true
      }
    }).then(res => {
      assert.equal(res, true);
    });
  });

  it('creates flags if needed', () => {
    const url = 'https://example.com';
    const driver = fakeDriver;
    const options = {url, driver};

    return Driver.run([], options).then(_ => {
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

    return Driver.loadPage(driver, {url: 'https://example.com'})
        .then(res => {
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

    return Driver.setupDriver(driver, {}, {
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

    return Driver.setupDriver(driver, {}, {
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
      }
    };

    const config = {
      trace: true,
      gatherers: [{
        setup() {}
      }]
    };

    return Driver.setup({driver, config}).then(_ => {
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

    return Driver.afterPass({driver, config}).then(vals => {
      assert.equal(calledTrace, true);
      assert.deepEqual(vals.traceContents, {x: 1});
    });
  });

  it('tells the driver to begin network collection', () => {
    let calledNetworkCollect = false;
    const driver = {
      beginNetworkCollect() {
        calledNetworkCollect = true;
        return Promise.resolve();
      }
    };

    const config = {
      network: true,
      gatherers: [{
        setup() {}
      }]
    };

    return Driver.setup({driver, config}).then(_ => {
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

    return Driver.afterPass({driver, config}).then(vals => {
      assert.equal(calledNetworkCollect, true);
      assert.deepEqual(vals.networkRecords, {x: 1});
    });
  });

  it('rejects when not given a URL', () => {
    return Driver.run({}, {}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('rejects when given a URL of zero length', () => {
    return Driver.run({}, {url: ''}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('does as many passes as are required', () => {
    const t1 = new TestGatherer();
    const t2 = new TestGatherer();

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

    return Driver.run(passes, {driver: fakeDriver, url: 'https://example.com', flags: {}})
        .then(_ => {
          assert.ok(t1.called);
          assert.ok(t2.called);
        });
  });
});
