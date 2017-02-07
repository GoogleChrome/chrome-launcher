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

require('../../compiled-check.js')('chrome-launcher.js');

const ChromeLauncher = require('../../chrome-launcher.js').ChromeLauncher;
const log = require('../../../lighthouse-core/lib/log');
const assert = require('assert');

/* eslint-env mocha */

describe('ChromeLauncher', () => {
  it('doesn\'t fail when killed twice', () => {
    log.setLevel('error');
    const chromeInstance = new ChromeLauncher();
    return chromeInstance.run()
      .then(() => {
        log.setLevel();
        return Promise.all([
          chromeInstance.kill(),
          chromeInstance.kill()
        ]);
      });
  });

  it('doesn\'t launch multiple chrome processes', () => {
    log.setLevel('error');
    const chromeInstance = new ChromeLauncher();
    let pid;
    return chromeInstance.run()
      .then(() => {
        pid = chromeInstance.chrome.pid;
        return chromeInstance.run();
      })
      .then(() => {
        log.setLevel();
        assert.strictEqual(pid, chromeInstance.chrome.pid);
        return chromeInstance.kill();
      });
  });
});
