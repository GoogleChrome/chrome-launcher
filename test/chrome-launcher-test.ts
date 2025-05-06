/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {Launcher, launch, killAll, Options, getChromePath} from '../src/chrome-launcher.js';
import {DEFAULT_FLAGS} from '../src/flags.js';

import sinon from 'sinon';
import * as assert from 'assert';
import fs from 'fs';

import log from 'lighthouse-logger';

const {spy, stub} = sinon;

const fsMock = {
  openSync: () => {},
  closeSync: () => {},
  writeFileSync: () => {},
  rmdirSync: () => {},
  rmSync: () => {},
};

const launchChromeWithOpts = async (opts: Options = {}) => {
  const spawnStub = stub().returns({pid: 'some_pid', stdio: []});

  const chromeInstance =
      new Launcher(opts, {fs: fsMock as any, spawn: spawnStub as any});
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
    const fs = {...fsMock, rmdirSync: spy(), rmSync: spy()};
    const chromeInstance =
        new Launcher({userDataDir: 'some_path'}, {fs: fs as any});

    chromeInstance.prepare();

    chromeInstance.destroyTmp();
    assert.strictEqual(fs.rmdirSync.callCount, 0);
    assert.strictEqual(fs.rmSync.callCount, 0);
  });

  it('allows to overwrite browser prefs', async () => {
    const existStub = stub().returns(true)
    const readFileStub = stub().returns(JSON.stringify({ some: 'prefs' }))
    const writeFileStub = stub()
    const mkdirStub = stub()
    const fs = {...fsMock, rmdir: spy(), readFileSync: readFileStub, writeFileSync: writeFileStub, existsSync: existStub, mkdirSync: mkdirStub };
    const chromeInstance =
        new Launcher({prefs: {'download.default_directory': '/some/dir'}}, {fs: fs as any});

    chromeInstance.prepare();
    assert.equal(
      writeFileStub.getCall(0).args[1],
      '{"some":"prefs","download.default_directory":"/some/dir"}'
    )
  });

  it('allows to set browser prefs', async () => {
    const existStub = stub().returns(false)
    const readFileStub = stub().returns(Buffer.from(JSON.stringify({ some: 'prefs' })))
    const writeFileStub = stub()
    const mkdirStub = stub()
    const fs = {...fsMock, rmdir: spy(), readFileSync: readFileStub, writeFileSync: writeFileStub, existsSync: existStub, mkdirSync: mkdirStub };
    const chromeInstance =
        new Launcher({prefs: {'download.default_directory': '/some/dir'}}, {fs: fs as any});

    chromeInstance.prepare();
    assert.equal(readFileStub.getCalls().length, 0)
    assert.equal(
      writeFileStub.getCall(0).args[1],
      '{"download.default_directory":"/some/dir"}'
    )
  });

  it('cleans up the tmp dir after closing (mocked)', async () => {
    const rmMock = stub().callsFake((_path, _options) => {});
    const fs = {...fsMock, rmdirSync: rmMock, rmSync: rmMock};

    const chromeInstance = new Launcher({}, {fs: fs as any});

    chromeInstance.prepare();
    chromeInstance.destroyTmp();
    assert.strictEqual(rmMock.callCount, 1);
  });


  it('cleans up the tmp dir after closing (real)', async () => {
    const rmSpy = spy(fs, 'rmSync' in fs ? 'rmSync' : 'rmdirSync');
    const fsFake = {...fsMock, rmdirSync: rmSpy, rmSync: rmSpy};

    const chromeInstance = new Launcher({}, {fs: fsFake as any});

    await chromeInstance.launch();
    assert.ok(chromeInstance.userDataDir);
    assert.ok(fs.existsSync(chromeInstance.userDataDir));

    chromeInstance.kill();

    // tmpdir is gone 
    const [path] = fsFake.rmSync.getCall(0).args;
    assert.strictEqual(chromeInstance.userDataDir, path);
    assert.equal(fs.existsSync(path), false, `userdatadir still exists: ${path}`);
  }).timeout(30 * 1000);

  it('does not delete created directory when custom path passed', () => {
    const chromeInstance = new Launcher({userDataDir: 'some_path'}, {fs: fsMock as any});

    chromeInstance.prepare();
    assert.strictEqual(chromeInstance.userDataDir, 'some_path');
  });

  it('defaults to genering a tmp dir when no data dir is passed', () => {
    const chromeInstance = new Launcher({}, {fs: fsMock as any});
    const originalMakeTmp = chromeInstance.makeTmpDir;
    chromeInstance.makeTmpDir = () => 'tmp_dir'
    chromeInstance.prepare()
    assert.strictEqual(chromeInstance.userDataDir, 'tmp_dir');

    // Restore the original fn.
    chromeInstance.makeTmpDir = originalMakeTmp;
  });

  it('doesn\'t fail when killed twice', async () => {
    const chromeInstance = new Launcher();
    await chromeInstance.launch();
    chromeInstance.kill();
    chromeInstance.kill();
  }).timeout(30 * 1000);

  it('doesn\'t fail when killing all instances', async () => {
    await launch();
    await launch();
    const errors = killAll();
    assert.strictEqual(errors.length, 0);
  });

  it('doesn\'t launch multiple chrome processes', async () => {
    const chromeInstance = new Launcher();
    await chromeInstance.launch();
    let pid = chromeInstance.pid!;
    await chromeInstance.launch();
    assert.strictEqual(pid, chromeInstance.pid);
    chromeInstance.kill();
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
  }).timeout(30_000);

  it('removes --user-data-dir if userDataDir is false', async () => {
    const spawnStub = await launchChromeWithOpts();
    const chromeFlags = spawnStub.getCall(0).args[1] as string[];
    assert.ok(!chromeFlags.includes('--user-data-dir'));
  });

  it('passes no env vars when none are passed', async () => {
    const spawnStub = await launchChromeWithOpts();
    const spawnOptions = spawnStub.getCall(0).args[2] as {env: {}};
    assert.deepStrictEqual(spawnOptions.env, Object.assign({}, process.env));
  });

  it('passes env vars when passed', async () => {
    const envVars = {'hello': 'world'};
    const spawnStub = await launchChromeWithOpts({envVars});
    const spawnOptions = spawnStub.getCall(0).args[2] as {env: {}};
    assert.deepStrictEqual(spawnOptions.env, envVars);
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

  describe('remote-debugging-pipe flag', () => {
    // These tests perform some basic tests on the expected effects of passing
    // the --remote-debugging-pipe flag. There is a real end-to-end example in
    // load-extension-test.ts.
    it('remote-debugging-pipe flag adds pipes expected by Chrome', async () => {
      const spawnStub = await launchChromeWithOpts({chromeFlags: ['--remote-debugging-pipe']});
      const stdioAndPipes = spawnStub.getCall(0).args[2].stdio as string[];
      assert.equal(stdioAndPipes.length, 5, 'Passed pipes to Chrome');
      assert.equal(stdioAndPipes[3], 'pipe', 'Fourth pipe is pipe');
      assert.equal(stdioAndPipes[4], 'pipe', 'Fifth pipe is pipe');
    });

    it('without remote-debugging-pipe flag, no pipes', async () => {
      const spawnStub = await launchChromeWithOpts({});
      const stdioAndPipes = spawnStub.getCall(0).args[2].stdio as string[];
      assert.equal(stdioAndPipes.length, 3, 'Only standard stdio pipes');
    });

    it('remote-debugging-pipe flag without remote-debugging-port', async () => {
      const spawnStub = await launchChromeWithOpts({chromeFlags: ['--remote-debugging-pipe']});
      const chromeFlags = spawnStub.getCall(0).args[1] as string[];
      assert.notEqual(chromeFlags.indexOf('--remote-debugging-pipe'), -1);
      assert.ok(
          !chromeFlags.find(f => f.startsWith('--remote-debugging-port')),
          '--remote-debugging-port should be unset');
    });

    it('remote-debugging-pipe flag with value is also accepted', async () => {
      // Chrome's source code indicates that it may support formats other than
      // JSON, as an explicit value. Here is an example of what it could look
      // like. Since chrome-launcher does not interpret the data in the pipes,
      // we can support arbitrary types.
      const spawnStub = await launchChromeWithOpts({chromeFlags: ['--remote-debugging-pipe=cbor']});
      const stdioAndPipes = spawnStub.getCall(0).args[2].stdio as string[];
      assert.equal(stdioAndPipes.length, 5);
    });
  });

  describe('getChromePath', async () => {
    it('returns the same path as a full Launcher launch', async () => {
      const spawnStub = await launchChromeWithOpts();
      const launchedPath = spawnStub.getCall(0).args[0] as string;

      const chromePath = getChromePath();
      assert.strictEqual(chromePath, launchedPath);
    });
  });
});
