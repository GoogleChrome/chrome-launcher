/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {join} from 'path';
import {execSync} from 'child_process';
import * as mkdirp from 'mkdirp';

export function defaults<T>(val: T | undefined, def: T): T {
  return typeof val === 'undefined' ? def : val;
}

export async function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

export function makeTmpDir() {
  switch (process.platform) {
    case 'darwin':
    case 'linux':
      return makeUnixTmpDir();
    case 'win32':
      return makeWin32TmpDir();
    default:
      throw new Error(`Platform ${process.platform} is not supported`);
  }
}

function makeUnixTmpDir() {
  return execSync('mktemp -d -t lighthouse.XXXXXXX').toString().trim();
}

function makeWin32TmpDir() {
  const winTmpPath = process.env.TEMP || process.env.TMP ||
      (process.env.SystemRoot || process.env.windir) + '\\temp';
  const randomNumber = Math.floor(Math.random() * 9e7 + 1e7);
  const tmpdir = join(winTmpPath, 'lighthouse.' + randomNumber);

  mkdirp.sync(tmpdir);
  return tmpdir;
}
