/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

import {launch} from '../chrome-launcher';
import {spy, stub} from 'sinon';
import * as assert from 'assert';
import * as cp from "child_process";

const log = require('lighthouse-logger');
const fsMock = {
  openSync: () => {
  },
  closeSync: () => {
  },
  writeFileSync: () => {
  }
};

describe('Launcher', () => {

  beforeEach(() => {
    log.setLevel('error');
  });

  afterEach(() => {
    log.setLevel('');
  });

  it('throws an error when chromePath is empty', (done) => {
    this.timeout = 3500;
    launch().then(function (v) {
      assert(v.chromeProcess instanceof cp.ChildProcess);
      assert.equal(typeof v.pid, 'number');
      assert.equal(typeof v.port, 'number');
      assert.equal(typeof v.kill, 'function');
      done();
    });
  });
});
