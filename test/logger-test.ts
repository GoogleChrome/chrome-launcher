/**
 * @license Copyright 2026 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {describe, it, beforeEach, afterEach} from 'node:test';
import * as assert from 'assert';
import debug from 'debug';
import log from '../dist/logger.js';

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
});
