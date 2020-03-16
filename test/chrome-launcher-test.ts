/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {Launcher, launch, killAll, Options} from '../src/chrome-launcher';
import {DEFAULT_FLAGS} from '../src/flags';

import {spy, stub} from 'sinon';
import * as assert from 'assert';

const log = require('lighthouse-logger');
const fsMock = {
  openSync: () => {},
  closeSync: () => {},
  writeFileSync: () => {}
};

const launchChromeWithOpts = async (opts: Options = {}) => {
  const spawnStub = stub().returns({pid: 'some_pid'});

  const chromeInstance =
      new Launcher(opts, {fs: fsMock as any, rimraf: spy() as any, spawn: spawnStub as any});
  stub(chromeInstance, 'waitUntilReady').returns(Promise.resolve());

  chromeInstance.prepare();

  try {
    await chromeInstance.launch();
    return Promise.resolve(spawnStub);
  } catch (err) {
    return Promise.reject(err);
  }
};

describe('Launcher', () => {
  beforeEach(() => {
    log.setLevel('error');
  });

  afterEach(() => {
    log.setLevel('');
  });

  it('sets default launching flags', async () => {
    const spawnStub = await launchChromeWithOpts({userDataDir: 'some_path'});
    const chromeFlags = spawnStub.getCall(0).args[1] as string[];
    assert.ok(chromeFlags.find(f => f.startsWith('--remote-debugging-port')))
    assert.ok(chromeFlags.find(f => f.startsWith('--disable-background-networking')))
    assert.strictEqual(chromeFlags[chromeFlags.length - 1], 'about:blank');
  });

  it('accepts and uses a custom path', async () => {
    const rimrafMock = spy();
    const chromeInstance =
        new Launcher({userDataDir: 'some_path'}, {fs: fsMock as any, rimraf: rimrafMock as any});

    chromeInstance.prepare();

    await chromeInstance.destroyTmp();
    assert.strictEqual(rimrafMock.callCount, 0);
  });

  it('cleans up the tmp dir after closing', async () => {
    const rimrafMock = stub().callsFake((_, done) => done());

    const chromeInstance = new Launcher({}, {fs: fsMock as any, rimraf: rimrafMock as any});

    chromeInstance.prepare();
    await chromeInstance.destroyTmp();
    assert.strictEqual(rimrafMock.callCount, 1);
  });

  it('does not delete created directory when custom path passed', () => {
    const chromeInstance = new Launcher({userDataDir: 'some_path'}, {fs: fsMock as any});

    chromeInstance.prepare();
    assert.equal(chromeInstance.userDataDir, 'some_path');
  });

  it('defaults to genering a tmp dir when no data dir is passed', () => {
    const chromeInstance = new Launcher({}, {fs: fsMock as any});
    const originalMakeTmp = chromeInstance.makeTmpDir;
    chromeInstance.makeTmpDir = () => 'tmp_dir'
    chromeInstance.prepare()
    assert.equal(chromeInstance.userDataDir, 'tmp_dir');

    // Restore the original fn.
    chromeInstance.makeTmpDir = originalMakeTmp;
  });

  it('doesn\'t fail when killed twice', async () => {
    const chromeInstance = new Launcher();
    await chromeInstance.launch();
    await chromeInstance.kill();
    await chromeInstance.kill();
  });

  it('doesn\'t fail when killing all instances', async () => {
    await launch();
    await launch();
    const errors = await killAll();
    assert.strictEqual(errors.length, 0);
  });

  it('doesn\'t launch multiple chrome processes', async () => {
    const chromeInstance = new Launcher();
    await chromeInstance.launch();
    let pid = chromeInstance.pid!;
    await chromeInstance.launch();
    assert.strictEqual(pid, chromeInstance.pid);
    await chromeInstance.kill();
  });

  it('gets all default flags', async () => {
    const flags = Launcher.defaultFlags();
    assert.ok(flags.length);
    assert.deepStrictEqual(flags, DEFAULT_FLAGS);
  });

  it('does not allow mutating default flags', async () => {
    const flags = Launcher.defaultFlags();
    flags.push('--new-flag');
    const currentDefaultFlags = Launcher.defaultFlags().slice();
    assert.notDeepStrictEqual(flags, currentDefaultFlags);
  });

  it('does not mutate default flags when launching', async () => {
    const originalDefaultFlags = Launcher.defaultFlags().slice();
    await launchChromeWithOpts();
    const currentDefaultFlags = Launcher.defaultFlags().slice();
    assert.deepStrictEqual(originalDefaultFlags, currentDefaultFlags);
  });

  it('removes all default flags', async () => {
    const spawnStub = await launchChromeWithOpts({ignoreDefaultFlags: true});
    const chromeFlags = spawnStub.getCall(0).args[1] as string[];
    assert.ok(!chromeFlags.includes('--disable-extensions'));
  });

  it('searches for available installations', async () => {
    const installations = Launcher.getInstallations();
    assert.ok(Array.isArray(installations));
    assert.ok(installations.length >= 1);
  });

  it('removes --user-data-dir if userDataDir is false', async () => {
    const spawnStub = await launchChromeWithOpts();
    const chromeFlags = spawnStub.getCall(0).args[1] as string[];
    assert.ok(!chromeFlags.includes('--user-data-dir'));
  });

  it('passes no env vars when none are passed', async () => {
    const spawnStub = await launchChromeWithOpts();
    const spawnOptions = spawnStub.getCall(0).args[2] as {env: {}};
    assert.deepEqual(spawnOptions.env, Object.assign({}, process.env));
  });

  it('passes env vars when passed', async () => {
    const envVars = {'hello': 'world'};
    const spawnStub = await launchChromeWithOpts({envVars});
    const spawnOptions = spawnStub.getCall(0).args[2] as {env: {}};
    assert.deepEqual(spawnOptions.env, envVars);
  });

  it('ensure specific flags are present when passed and defaults are ignored', async () => {
    const spawnStub = await launchChromeWithOpts({
      ignoreDefaultFlags: true,
      chromeFlags: ['--disable-extensions', '--mute-audio', '--no-first-run']
    });
    const chromeFlags = spawnStub.getCall(0).args[1] as string[];
    assert.ok(chromeFlags.includes('--mute-audio'));
    assert.ok(chromeFlags.includes('--disable-extensions'));

    // Make sure that default flags are not present
    assert.ok(!chromeFlags.includes('--disable-background-networking'));
    assert.ok(!chromeFlags.includes('--disable-default-app'));
  });

  it('throws an error when chromePath is empty', (done) => {
    const chromeInstance = new Launcher({chromePath: ''});
    chromeInstance.launch().catch(() => done());
  });

  describe('waitForTarget method', () => {
    function getChromeInstance(targetList: unknown, waitForInspectableTarget?: number) {
      const chromeInstance = new Launcher({waitForInspectableTarget: typeof waitForInspectableTarget === 'number' ? waitForInspectableTarget : 100});
      const getTargetListStub = stub(chromeInstance, 'getTargetList').returns(Promise.resolve(targetList));

      return {
        chromeInstance,
        getTargetListStub
      };
    }

    it('returns promise that is resolved with the same value as promise returned by getTargetList method', () => {
      const response = {
        body: ['test', 'list']
      };
      const {chromeInstance, getTargetListStub} = getChromeInstance(response);

      return chromeInstance.waitForTarget().then((result) => {
        assert.ok(getTargetListStub.calledOnce);
        assert.strictEqual(result, response);
      });
    });

    it('returns promise that is resolved with the same value as promise returned by getTargetList method after interval specified in waitForInspectableTarget option', () => {
      const response = {
        body: []
      };
      const waitTime = 90;
      const {chromeInstance, getTargetListStub} = getChromeInstance(response, waitTime);
      chromeInstance.getTargetRetryTimeout = 50;
      const startTime = new Date().getTime();

      return chromeInstance.waitForTarget().then((result) => {
        assert.ok(getTargetListStub.callCount === 3);
        assert.ok(new Date().getTime() - startTime > waitTime);
        assert.strictEqual(result, response);
      });
    });

    it('returns promise that is rejected with the same value as promise returned by getTargetList method after interval specified in waitForInspectableTarget option', () => {
      const reason = 'No target';
      const waitTime = 100;
      const {chromeInstance, getTargetListStub} = getChromeInstance(Promise.reject(reason), waitTime);
      chromeInstance.getTargetRetryTimeout = 40;
      const startTime = new Date().getTime();

      return chromeInstance.waitForTarget().catch((result) => {
        assert.ok(getTargetListStub.callCount === 4);
        assert.ok(new Date().getTime() - startTime > waitTime);
        assert.strictEqual(result, reason);
      });
    });
  });

  describe('waitForInspectableTarget option', () => {
    function getChromeInstance(options?: Options) {
      const chromeInstance = new Launcher(options);
      stub(chromeInstance, 'isDebuggerReady').returns(Promise.resolve());

      return chromeInstance;
    }

    it('waitUntilReady does not call waitForTarget method when the option is not set', () => {
      const chromeInstance = getChromeInstance();
      const waitForTargetSpy = spy(chromeInstance, 'waitForTarget');

      return chromeInstance.waitUntilReady().then(() => {
        assert.ok(waitForTargetSpy.notCalled);
      });
    });

    it('waitUntilReady does not call waitForTarget method when 0 is set for the option', () => {
      const chromeInstance = getChromeInstance({waitForInspectableTarget: 0});
      const waitForTargetSpy = spy(chromeInstance, 'waitForTarget');

      return chromeInstance.waitUntilReady().then(() => {
        assert.ok(waitForTargetSpy.notCalled);
      });
    });

    it('waitUntilReady does not call waitForTarget method when negative value is set for the option', () => {
      const chromeInstance = getChromeInstance({waitForInspectableTarget: -1});
      const waitForTargetSpy = spy(chromeInstance, 'waitForTarget');

      return chromeInstance.waitUntilReady().then(() => {
        assert.ok(waitForTargetSpy.notCalled);
      });
    });

    it('waitUntilReady calls waitForTarget method when the option is set', () => {
      const chromeInstance = getChromeInstance({waitForInspectableTarget: 1000});
      const response = {
        body: [{
          description: '',
          devtoolsFrontendUrl: '/devtools/inspector.html?ws=127.0.0.1:54321/devtools/page/1C2C62A45591F2DECB9CC50E7C3B1FA5',
          id: '1C2C62A45591F2DECB9CC50E7C3B1FA5',
          title: '',
          type: 'page',
          url: 'about:blank',
          webSocketDebuggerUrl: 'ws://127.0.0.1:54321/devtools/page/1C2C62A45591F2DECB9CC50E7C3B1FA5'
        }]
      };
      const waitForTargetStub = stub(chromeInstance, 'waitForTarget').returns(Promise.resolve(response));

      return chromeInstance.waitUntilReady().then((result) => {
        assert.ok(waitForTargetStub.calledOnce);
        assert.deepEqual(result, response.body);
      });
    });

    it('waitUntilReady rejects when waitForTarget method returns rejected promise', () => {
      const chromeInstance = getChromeInstance({waitForInspectableTarget: 1});
      const reason = 'No targets';
      const waitForTargetStub = stub(chromeInstance, 'waitForTarget').returns(Promise.reject(reason));

      return chromeInstance.waitUntilReady().catch((result) => {
        assert.ok(waitForTargetStub.calledOnce);
        assert.strictEqual(result, reason);
      });
    });
  });
});
