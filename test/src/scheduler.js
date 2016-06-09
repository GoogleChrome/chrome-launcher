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

const Gather = require('../../src/gatherers/gather');
const assetSaver = require('../../src/lib/asset-saver');
const scheduler = require('../../src/scheduler');
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

class TestScreenshotGatherer extends Gather {
  constructor() {
    super();
    this.afterPassCalled = false;
  }

  get name() {
    return 'screenshots';
  }

  afterPass() {
    this.afterPassCalled = true;
    const screenshots = require('../fixtures/traces/screenshots.json');
    this.artifact = screenshots;
  }
}

const fakeDriver = {
  connect() {
    return Promise.resolve();
  },
  disconnect() {},
  gotoURL() {
    return Promise.resolve();
  },

  cleanAndDisableBrowserCaches() {},
  forceUpdateServiceWorkers() {},
  beginTrace() {
    return Promise.resolve();
  },
  endTrace() {
    return Promise.resolve(
      require('../fixtures/traces/progressive-app.json')
    );
  },
  beginNetworkCollect() {},
  endNetworkCollect() {
    return Promise.resolve();
  }
};

describe('Scheduler', function() {
  it('loads a page', () => {
    const driver = {
      gotoURL() {
        return Promise.resolve(true);
      }
    };

    return scheduler.loadPage(driver, {}, {
      flags: {
        loadPage: true
      }
    }).then(res => {
      assert.equal(res, true);
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

    return scheduler.loadPage(driver, {url: 'https://example.com'})
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

    return scheduler.setupDriver(driver, {}, {
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

    return scheduler.setupDriver(driver, {}, {
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

    return scheduler.setup({driver, config}).then(_ => {
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

    return scheduler.afterPass({driver, config}).then(vals => {
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

    return scheduler.setup({driver, config}).then(_ => {
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

    return scheduler.afterPass({driver, config}).then(vals => {
      assert.equal(calledNetworkCollect, true);
      assert.deepEqual(vals.networkRecords, {x: 1});
    });
  });

  it('rejects when not given a URL', () => {
    return scheduler.run({}, {}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('rejects when given a URL of zero length', () => {
    return scheduler.run({}, {url: ''}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('does as many passes as are required', () => {
    const t1 = new TestGatherer();
    const t2 = new TestGatherer();

    const passes = [{
      network: true,
      trace: true,
      loadDataName: 'first-pass',
      loadPage: true,
      gatherers: [
        t1
      ]
    }, {
      loadPage: true,
      gatherers: [
        t2
      ]
    }];

    return scheduler.run(passes, {driver: fakeDriver, url: 'https://example.com', flags: {}})
        .then(_ => {
          assert.ok(t1.called);
          assert.ok(t2.called);
        });
  });

  describe('saves assets when --save-assets is set', function() {
    let saveAssetsCalled = false;
    const _saveAssets = assetSaver.saveAssets;
    assetSaver.saveAssets = function() {
      saveAssetsCalled = true;
      return _saveAssets.apply(this, arguments);
    };
    const screenshotGatherer = new TestScreenshotGatherer();
    const passes = [{
      network: true,
      trace: true,
      loadDataName: 'first-pass',
      loadPage: true,
      gatherers: [
        screenshotGatherer
      ]
    }];

    const options = {
      driver: fakeDriver,
      url: 'https://testexample.com',
      date: new Date(1464737670547),
      flags: {
        saveAssets: true
      }
    };

    it('collects artifacts and goes through the scheduler', () => {
      return scheduler.run(passes, options).then(_ => {
        assert.equal(screenshotGatherer.afterPassCalled, true);
      });
    });

    it('asset saving functions are called from scheduler', () => {
      assert.ok(saveAssetsCalled);
    });
  });
});
