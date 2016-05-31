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
const scheduler = require('../../src/scheduler');
const assert = require('assert');

class TestGathererOne extends Gather {
  get name() {
    return 'TestGathererOne';
  }
}

class TestGathererTwo extends Gather {
  constructor() {
    super();
    this.reloadSetupCalled = false;
  }
  get name() {
    return 'TestGathererTwo';
  }

  reloadSetup() {
    this.reloadSetupCalled = true;
  }
}

class TestGathererThree extends Gather {
  constructor() {
    super();
    this.afterSecondReloadPageLoadCalled = false;
  }

  get name() {
    return 'TestGathererThree';
  }

  afterSecondReloadPageLoad() {
    this.afterSecondReloadPageLoadCalled = true;
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

  },
  beginNetworkCollect() {},
  endNetworkCollect() {
    return Promise.resolve();
  }
};

describe('Scheduler', function() {
  it('does not load a page by default', () => {
    const driver = {
      gotoURL() {
        // If the driver is called, this test fails.
        assert.ok(false);
      }
    };

    return scheduler.loadPage(driver, {}, {flags: {}}).then(_ => assert.ok(true));
  });

  it('loads a page when told to do so', () => {
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

    return scheduler.reloadPage(driver, {url: 'https://example.com'}, {
      flags: {
        loadPage: true
      }
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

  it('tells the driver to begin passive collection', () => {
    let calledTrace = false;
    let calledNetworkCollect = false;
    const driver = {
      beginTrace() {
        calledTrace = true;
        return Promise.resolve();
      },
      beginNetworkCollect() {
        calledNetworkCollect = true;
        return Promise.resolve();
      }
    };

    return scheduler.beginPassiveCollection(driver).then(_ => {
      assert.equal(calledTrace, true);
      assert.equal(calledNetworkCollect, true);
    });
  });

  it('tells the driver to end passive collection', () => {
    let calledTrace = false;
    let calledNetworkCollect = false;
    const driver = {
      endTrace() {
        calledTrace = true;
        return Promise.resolve({
          x: 1
        });
      },
      endNetworkCollect() {
        calledNetworkCollect = true;
        return Promise.resolve({
          y: 2
        });
      }
    };

    const vals = {};
    return scheduler.endPassiveCollection({driver}, vals).then(_ => {
      assert.equal(calledTrace, true);
      assert.equal(calledNetworkCollect, true);
      assert.deepEqual(vals.traceContents, {x: 1});
      assert.deepEqual(vals.networkRecords, {y: 2});
    });
  });

  it('creates a chain for phase', () => {
    const gatherers = [{
      changeValue(x) {
        x.value += 1;
      }
    }, {
      changeValue(x) {
        x.value += 2;
      }
    }, {
      changeValue(x) {
        x.value *= 2;
      }
    }];

    let target = {
      value: 0
    };
    const phase = scheduler.phaseRunner(gatherers);
    return phase(g => {
      return g.changeValue(target);
    }).then(_ => {
      assert.equal(target.value, 6);
    });
  });

  it('rejects when not given a URL', () => {
    return scheduler.run({}, {}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('rejects when given a URL of zero length', () => {
    return scheduler.run({}, {url: ''}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('does the first pass when future passes are not required', () => {
    // If, in this phase reloadSetup is called then it's called second phase code,
    // which would be incorrect here.
    const origReloadSetup = Gather.prototype.reloadSetup;
    const origAfterSecondReloadPageLoad = Gather.prototype.afterSecondReloadPageLoad;

    // If either of these are called then the test should fail.
    Gather.prototype.reloadSetup = Gather.prototype.afterSecondReloadPageLoad = () => {
      assert.ok(false);
    };

    const gatherers = [new TestGathererOne()];

    return scheduler.run(gatherers, {driver: fakeDriver, url: 'https://example.com', flags: {}})
        .then(_ => {
          assert.ok(true);

          // Reset the proto methods.
          Gather.prototype.reloadSetup = origReloadSetup;
          Gather.prototype.afterSecondReloadPageLoad = origAfterSecondReloadPageLoad;
        });
  });

  it('does a second pass when required', () => {
    // Fail the test if afterSecondReloadPageLoad is called, but look for reloadPage to be called
    // and, if it is, consider this test good.
    const origAfterSecondReloadPageLoad = Gather.prototype.afterSecondReloadPageLoad;
    Gather.prototype.afterSecondReloadPageLoad = () => {
      assert.ok(false);
    };
    const tgTwo = new TestGathererTwo();
    const gatherers = [tgTwo];

    return scheduler.run(gatherers, {driver: fakeDriver, url: 'https://example.com', flags: {}})
        .then(_ => {
          assert.equal(tgTwo.reloadSetupCalled, true);

          // Reset the proto method.
          Gather.prototype.afterSecondReloadPageLoad = origAfterSecondReloadPageLoad;
        });
  });

  it('does a third pass when required', () => {
    const origReloadSetup = Gather.prototype.reloadSetup;
    const tgThree = new TestGathererThree();
    const gatherers = [tgThree];

    // If reloadSetup is called for this gatherer then fail the test.
    Gather.prototype.reloadSetup = () => {
      assert.ok(false);
    };

    return scheduler.run(gatherers, {driver: fakeDriver, url: 'https://example.com', flags: {}})
        .then(_ => {
          assert.equal(tgThree.afterSecondReloadPageLoadCalled, true);

          // Reset.
          Gather.prototype.reloadSetup = origReloadSetup;
        });
  });

  it('does all three passes when required', () => {
    const tgOne = new TestGathererOne();
    const tgTwo = new TestGathererTwo();
    const tgThree = new TestGathererThree();
    const gatherers = [tgOne, tgTwo, tgThree];

    return scheduler.run(gatherers, {driver: fakeDriver, url: 'https://example.com', flags: {}})
        .then(_ => {
          assert.equal(tgTwo.reloadSetupCalled, true);
          assert.equal(tgThree.afterSecondReloadPageLoadCalled, true);
        });
  });
});
