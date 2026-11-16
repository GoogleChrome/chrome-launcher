/**
 * @license Copyright 2026 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {describe, it, beforeEach, afterEach} from 'node:test';
import {execFileSync} from 'node:child_process';
import * as assert from 'assert';
import debug from 'debug';
import log from '../dist/logger.js';

const loggerModuleUrl = new URL('../dist/logger.js', import.meta.url).href;

describe('logger', () => {
  const origDebugLog = debug.log;
  const origNamespaces = debug.disable();
  let captured: string[];

  beforeEach(() => {
    captured = [];
    debug.log = (...args: unknown[]) => {
      captured.push(args.map(String).join(' '));
    };
  });

  afterEach(() => {
    debug.log = origDebugLog;
    debug.enable(origNamespaces);
    log.setLevel('');
  });

  it('filters messages according to setLevel', () => {
    log.setLevel('silent');
    log.log('info msg');
    log.verbose('verbose msg');
    log.warn('warn msg');
    log.error('error msg');
    assert.deepStrictEqual(captured, []);

    log.setLevel('error');
    log.warn('warn msg');
    log.error('error msg');
    assert.strictEqual(captured.length, 1);
    assert.ok(captured[0].includes('error msg'));

    captured = [];
    log.setLevel('warn');
    log.log('info msg');
    log.warn('warn msg');
    log.error('error msg');
    assert.strictEqual(captured.length, 2);

    captured = [];
    log.setLevel('info');
    log.log('info msg');
    log.verbose('verbose msg');
    assert.strictEqual(captured.length, 1);
    assert.ok(captured[0].includes('info msg'));

    captured = [];
    log.setLevel('verbose');
    log.log('info msg');
    log.verbose('verbose msg');
    assert.strictEqual(captured.length, 2);
  });

  it('does not clobber unrelated debug namespaces', () => {
    debug.enable('LH:*');
    const externalLogger = debug('LH:status');

    log.setLevel('silent');
    assert.strictEqual(externalLogger.enabled, true);

    log.setLevel(undefined);
    assert.strictEqual(externalLogger.enabled, true);
  });

  it('respects DEBUG=ChromeLauncher* when logLevel is undefined', () => {
    debug.enable('ChromeLauncher*');
    log.setLevel(undefined);
    log.log('hello from env');
    assert.strictEqual(captured.length, 1);
    assert.ok(captured[0].includes('hello from env'));
  });

  it('preserves dynamic debug.enable(ChromeLauncher*) across a subsequent debug.enable(LH:*)',
     () => {
       debug.enable('ChromeLauncher*,-ChromeLauncher:verbose');
       log.setLevel(undefined);
       log.log('before LH');

       // Simulates Lighthouse running mid-session and calling `debug.enable('LH:*')`
       // before `chrome.kill()` logs its teardown messages.
       debug.enable('LH:*');
       log.log('after LH');
       log.verbose('suppressed verbose');

       assert.strictEqual(captured.length, 2);
       assert.ok(captured[0].includes('before LH'));
       assert.ok(captured[1].includes('after LH'));
     });

  it('preserves process.env.DEBUG=ChromeLauncher* when debug.enable(LH:*) runs before or after setLevel(undefined)',
     () => {
       const script = `
      import debug from 'debug';
      import log from ${JSON.stringify(loggerModuleUrl)};

      const captured = [];
      debug.log = (...args) => captured.push(args.map(String).join(' '));

      // 1) Overwrite global debug namespaces BEFORE setLevel(undefined) runs.
      debug.enable('LH:*');
      log.setLevel(undefined);
      log.log('after pre-LH');
      log.verbose('suppressed verbose');

      // 2) Overwrite global debug namespaces again AFTER setLevel(undefined).
      debug.enable('LH:*,-LH:*:verbose');
      log.warn('after post-LH');

      console.log(JSON.stringify(captured));
    `;

       const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
         encoding: 'utf8',
         env: {...process.env, DEBUG: 'ChromeLauncher*,-ChromeLauncher:verbose'},
       });
       const lines = JSON.parse(stdout.trim()) as string[];
       assert.strictEqual(lines.length, 2);
       assert.ok(lines[0].includes('after pre-LH'));
       assert.ok(lines[1].includes('after post-LH'));
     });
});
