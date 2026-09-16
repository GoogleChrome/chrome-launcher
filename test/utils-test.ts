/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

import * as assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { toWin32Path, toWSLPath, getWSLLocalAppDataPath, makeWin32TmpDir, makeTmpDir, _childProcessForTesting } from '../src/utils.js';
import sinon from 'sinon';

const execFileSyncStub = sinon.stub(_childProcessForTesting, 'execFileSync').callThrough();

const asBuffer = (str: string): Buffer => Buffer.from(str, 'utf-8');

describe('toWin32Path', () => {
  beforeEach(() => execFileSyncStub.reset());

  it('calls toWin32Path -w', () => {
    execFileSyncStub.returns(asBuffer(''));

    toWin32Path('');

    assert.ok(execFileSyncStub.calledWith('wslpath', ['-w', '']));
  })

  describe('when the path is already in Windows format', () => {
    it('returns early', () => {
      execFileSyncStub.returns(asBuffer(''));

      assert.strictEqual(toWin32Path('D:\\'), 'D:\\');
      assert.strictEqual(toWin32Path('C:\\'), 'C:\\');

      assert.ok(execFileSyncStub.notCalled);
    });
  })

  describe('when wslpath is not available', () => {
    beforeEach(() => execFileSyncStub.throws(new Error('oh noes!')));

    it('falls back to the toWinDirFormat method', () => {
      const wsl = '/mnt/c/Users/user1/AppData/';
      const windows = 'C:\\Users\\user1\\AppData\\';

      assert.strictEqual(toWin32Path(wsl), windows);
    });

    it('supports the drive letter not being C', () => {
      const wsl = '/mnt/d/Users/user1/AppData';
      const windows = 'D:\\Users\\user1\\AppData';

      assert.strictEqual(toWin32Path(wsl), windows);
    })
  });
})

describe('toWSLPath', () => {
  beforeEach(() => execFileSyncStub.reset());

  it('calls wslpath -u', () => {
    execFileSyncStub.returns(asBuffer(''));

    toWSLPath('', '');

    assert.ok(execFileSyncStub.calledWith('wslpath', ['-u', '']));
  })

  it('trims off the trailing newline', () => {
    execFileSyncStub.returns(asBuffer('the-path\n'));

    assert.strictEqual(toWSLPath('', ''), 'the-path');
  })

  describe('when wslpath is not available', () => {
    beforeEach(() => execFileSyncStub.throws(new Error('oh noes!')));

    it('uses the fallback path', () => {
      assert.strictEqual(
        toWSLPath('C:/Program Files', '/mnt/c/Program Files'),
        '/mnt/c/Program Files'
      );
    })
  })
})

describe('getWSLLocalAppDataPath', () => {
  beforeEach(() => execFileSyncStub.reset());

  it('transforms it to a Linux path using wslpath', () => {
    execFileSyncStub.returns(asBuffer('/c/folder/'));

    const path = '/mnt/c/Users/user1/.bin:/mnt/c/Users/user1:/mnt/c/Users/user1/AppData/';

    assert.strictEqual(getWSLLocalAppDataPath(path), '/c/folder/');
    assert.ok(execFileSyncStub.calledWith('wslpath', ['-u', 'c:\\Users\\user1\\AppData\\Local']));
  });

  describe('when wslpath is not available', () => {
    beforeEach(() => execFileSyncStub.throws(new Error('oh noes!')));

    it('falls back to the getLocalAppDataPath method', () => {
      const path = '/mnt/c/Users/user1/.bin:/mnt/c/Users/user1:/mnt/c/Users/user1/AppData/';
      const appDataPath = '/mnt/c/Users/user1/AppData/Local';

      assert.strictEqual(getWSLLocalAppDataPath(path), appDataPath);
    });
  });
});

describe('makeWin32TmpDir', () => {
  let originalTemp: string | undefined;
  let testTmpDir: string;

  beforeEach(() => {
    originalTemp = process.env.TEMP;
    testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-test-'));
    process.env.TEMP = testTmpDir;
  });

  afterEach(() => {
    if (originalTemp !== undefined) {
      process.env.TEMP = originalTemp;
    } else {
      delete process.env.TEMP;
    }
    fs.rmSync(testTmpDir, {recursive: true, force: true});
  });

  it('creates unique directories with lighthouse. prefix', () => {
    const dir1 = makeWin32TmpDir();
    const dir2 = makeWin32TmpDir();

    assert.notStrictEqual(dir1, dir2);
    assert.ok(fs.existsSync(dir1));
    assert.ok(fs.existsSync(dir2));
    assert.ok(path.basename(dir1).startsWith('lighthouse.'));
    assert.ok(path.basename(dir2).startsWith('lighthouse.'));
  });

  it('creates distinct directory paths independently of random seed', () => {
    const randomStub = sinon.stub(Math, 'random').returns(0.12345678);
    try {
      const dir1 = makeWin32TmpDir();
      const dir2 = makeWin32TmpDir();

      assert.notStrictEqual(dir1, dir2);
      assert.strictEqual(randomStub.called, false);
    } finally {
      randomStub.restore();
    }
  });

  it('does not overwrite or reuse existing directories in temp path', () => {
    const randomStub = sinon.stub(Math, 'random').returns(0.5);
    try {
      const predictedDir = path.join(testTmpDir, 'lighthouse.55000000');
      fs.mkdirSync(predictedDir);
      fs.writeFileSync(path.join(predictedDir, 'existing.txt'), 'do-not-delete');

      const createdDir = makeWin32TmpDir();

      assert.notStrictEqual(createdDir, predictedDir);
      assert.strictEqual(fs.existsSync(path.join(createdDir, 'existing.txt')), false);
    } finally {
      randomStub.restore();
    }
  });
});

describe('makeTmpDir (win32 platform)', () => {
  let originalPlatform: PropertyDescriptor | undefined;
  let originalTemp: string | undefined;
  let testTmpDir: string;

  beforeEach(() => {
    originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', {value: 'win32', configurable: true});
    originalTemp = process.env.TEMP;
    testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-test-'));
    process.env.TEMP = testTmpDir;
  });

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform);
    }
    if (originalTemp !== undefined) {
      process.env.TEMP = originalTemp;
    } else {
      delete process.env.TEMP;
    }
    fs.rmSync(testTmpDir, {recursive: true, force: true});
  });

  it('delegates to makeWin32TmpDir on win32', () => {
    const dir1 = makeTmpDir();
    const dir2 = makeTmpDir();

    assert.notStrictEqual(dir1, dir2);
    assert.ok(fs.existsSync(dir1));
    assert.ok(fs.existsSync(dir2));
    assert.ok(path.basename(dir1).startsWith('lighthouse.'));
    assert.ok(path.basename(dir2).startsWith('lighthouse.'));
  });
});

