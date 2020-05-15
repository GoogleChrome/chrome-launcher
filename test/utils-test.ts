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
import { toWin32Path, toWSLPath, getWSLLocalAppDataPath } from '../src/utils';
import * as sinon from 'sinon';
import * as child_process from 'child_process';

const execFileSyncStub = sinon.stub(child_process, 'execFileSync').callThrough();

const asBuffer = (str: string): Buffer => Buffer.from(str, 'utf-8');

describe('toWin32Path', () => {
  beforeEach(() => execFileSyncStub.reset());

  it('calls toWin32Path -w', () => {
    execFileSyncStub.returns(asBuffer(''));

    toWin32Path('');

    assert.ok(execFileSyncStub.calledWith('wslpath', ['-w', '']));
  })
})

describe('toWSLPath', () => {
  beforeEach(() => execFileSyncStub.reset());

  it('calls wslpath -u', () => {
    execFileSyncStub.returns(asBuffer(''));

    toWSLPath('');

    assert.ok(execFileSyncStub.calledWith('wslpath', ['-u', '']));
  })

  it('trims off the trailing newline', () => {
    execFileSyncStub.returns(asBuffer('the-path\n'));

    assert.deepStrictEqual(toWSLPath(''), 'the-path');
  })
})

describe('getWSLLocalAppDataPath', () => {
  beforeEach(() => execFileSyncStub.reset());

  it('transforms it to a Linux path using wslpath', () => {
    execFileSyncStub.returns(asBuffer('/c/folder/'));

    const path = '/mnt/c/Users/user1/.bin:/mnt/c/Users/user1:/mnt/c/Users/user1/AppData/';

    assert.deepStrictEqual(getWSLLocalAppDataPath(path), '/c/folder/');
    assert.ok(execFileSyncStub.calledWith('wslpath', ['-u', 'c:\\Users\\user1\\AppData\\Local']));
  });
});
