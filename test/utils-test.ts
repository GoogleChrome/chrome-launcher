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
import { toWin32Path, toWSLPath, getWSLLocalAppDataPath, _childProcessForTesting } from '../src/utils.js';
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
