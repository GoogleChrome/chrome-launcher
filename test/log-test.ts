/**
 * @license Copyright 2026 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {describe, it, mock} from 'node:test';
import * as assert from 'assert';
import {spawnSync} from 'child_process';
import path from 'path';
import {fileURLToPath, pathToFileURL} from 'url';

import {Launcher} from '../dist/chrome-launcher.js';
import type {Logger} from '../dist/chrome-launcher.js';

const fsMock = {
  openSync: () => {},
  closeSync: () => {},
  writeFileSync: () => {},
  rmSync: () => {},
};

const logModule = pathToFileURL(path.resolve(
    path.dirname(fileURLToPath(import.meta.url)), '../dist/log.js')).href;

// NODE_DEBUG is only read when the process starts, so use a child process.
function defaultLoggerOutput(nodeDebug: string|undefined): string[] {
  const script = `
    const {defaultLogger} = await import(${JSON.stringify(logModule)});
    defaultLogger.debug('d');
    defaultLogger.info('i');
    defaultLogger.warn('w');
    defaultLogger.error('e');
  `;
  const env = {...process.env};
  delete env.NODE_DEBUG;
  if (nodeDebug !== undefined) env.NODE_DEBUG = nodeDebug;
  const {stderr, stdout, status} = spawnSync(
      process.execPath, ['--input-type=module', '-e', script], {env, encoding: 'utf8'});
  assert.strictEqual(status, 0, stderr);
  assert.strictEqual(stdout, '');
  // Lines look like `CHROME-LAUNCHER 1234: message`. Drop the pid.
  return stderr.split('\n').filter(Boolean).map(line => line.replace(/ \d+: /, ' '));
}

describe('default logger', () => {
  it('is silent when NODE_DEBUG is not set', () => {
    assert.deepStrictEqual(defaultLoggerOutput(undefined), []);
  });

  it('logs info, warnings and errors with NODE_DEBUG=chrome-launcher', () => {
    assert.deepStrictEqual(defaultLoggerOutput('chrome-launcher'), [
      'CHROME-LAUNCHER i',
      'CHROME-LAUNCHER warning: w',
      'CHROME-LAUNCHER error: e',
    ]);
  });

  it('also logs debug messages with NODE_DEBUG=chrome-launcher*', () => {
    assert.deepStrictEqual(defaultLoggerOutput('chrome-launcher*'), [
      'CHROME-LAUNCHER:VERBOSE d',
      'CHROME-LAUNCHER i',
      'CHROME-LAUNCHER warning: w',
      'CHROME-LAUNCHER error: e',
    ]);
  });
});

describe('logger option', () => {
  it('sends the launcher\'s messages to the injected logger', () => {
    const logger = {
      debug: mock.fn((_message: string) => {}),
      info: mock.fn((_message: string) => {}),
      warn: mock.fn((_message: string) => {}),
      error: mock.fn((_message: string) => {}),
    } satisfies Logger;

    const launcher = new Launcher({userDataDir: 'some_path', logger}, {fs: fsMock as any});
    launcher.prepare();

    assert.deepStrictEqual(
        logger.debug.mock.calls.map(call => call.arguments), [['created some_path']]);
  });

  it('accepts console', () => {
    const logger: Logger = console;
    assert.ok(new Launcher({logger}));
  });
});
