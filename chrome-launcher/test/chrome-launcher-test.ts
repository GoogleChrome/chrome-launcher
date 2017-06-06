/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {Launcher} from '../chrome-launcher';

import * as assert from 'assert';

const log = require('../../lighthouse-core/lib/log');
const fsMock = {
  openSync: () => {},
  closeSync: () => {}
};

describe('Launcher', () => {
  it('accepts and uses a custom path', async () => {
    log.setLevel('error');
    let callCount = 0;
    const rimrafMock = (_: string, done: () => void) => {
      callCount++;
      done();
    };

    const chromeInstance =
        new Launcher({userDataDir: 'some_path'}, {fs: fsMock as any, rimraf: rimrafMock as any});

    chromeInstance.prepare();

    await chromeInstance.destroyTmp();
    assert.strictEqual(callCount, 0);
  });

  it('cleans up the tmp dir after closing', async () => {
    log.setLevel('error');
    let callCount = 0;
    const rimrafMock = (_: string, done: () => void) => {
      callCount++;
      done();
    };

    const chromeInstance = new Launcher({}, {fs: fsMock as any, rimraf: rimrafMock as any});

    chromeInstance.prepare();
    await chromeInstance.destroyTmp();
    assert.strictEqual(callCount, 1);
  });

  it('does not delete created directory when custom path passed', () => {
    log.setLevel('error');

    const chromeInstance = new Launcher({userDataDir: 'some_path'}, {fs: fsMock as any});

    chromeInstance.prepare();
    assert.equal(chromeInstance.userDataDir, 'some_path');
  });

  it('defaults to genering a tmp dir when no data dir is passed', () => {
    log.setLevel('error');
    const chromeInstance = new Launcher({}, {fs: fsMock as any});
    const originalMakeTmp = chromeInstance.makeTmpDir;
    chromeInstance.makeTmpDir = () => 'tmp_dir'
    chromeInstance.prepare()
    assert.equal(chromeInstance.userDataDir, 'tmp_dir');

    // Restore the original fn.
    chromeInstance.makeTmpDir = originalMakeTmp;
  });

  it('doesn\'t fail when killed twice', async () => {
    log.setLevel('error');
    const chromeInstance = new Launcher();
    await chromeInstance.launch();
    log.setLevel();
    await chromeInstance.kill();
    await chromeInstance.kill();
  });

  it('doesn\'t launch multiple chrome processes', async () => {
    log.setLevel('error');
    const chromeInstance = new Launcher();
    await chromeInstance.launch();
    let pid = chromeInstance.pid!;
    await chromeInstance.launch();
    log.setLevel();
    assert.strictEqual(pid, chromeInstance.pid);
    await chromeInstance.kill();
  });
});
