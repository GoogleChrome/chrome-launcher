/**
 * @license Copyright 2026 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import debug from 'debug';

const isWindows = process.platform === 'win32';

const logNormal = debug('ChromeLauncher');
const logVerbose = debug('ChromeLauncher:verbose');
const logWarn = debug('ChromeLauncher:warn');
const logError = debug('ChromeLauncher:error');

// Snapshot initial `process.env.DEBUG` matches at module load so `setLevel(undefined)`
// still respects `DEBUG=ChromeLauncher*` even if another library (e.g. `lighthouse`)
// later calls `debug.enable(...)` and overwrites global `debug` namespaces.
const envDefaults = {
  normal: logNormal.enabled,
  verbose: logVerbose.enabled,
  warn: logWarn.enabled,
  error: logError.enabled,
};

// Force yellow for warnings and red for errors in Node.
(logWarn as unknown as {color: number}).color = 3;
(logError as unknown as {color: number}).color = 1;

export type LogLevel = 'verbose'|'info'|'error'|'warn'|'silent'|'';

function setEnabled(normal: boolean, verbose: boolean, warn: boolean, error: boolean) {
  logNormal.enabled = normal;
  logVerbose.enabled = verbose;
  logWarn.enabled = warn;
  logError.enabled = error;
}

const log = {
  setLevel(level?: LogLevel) {
    if (level === undefined) {
      // Respect `DEBUG=ChromeLauncher*` when `logLevel` is not explicitly configured;
      // otherwise default to silent without clobbering global `debug` namespaces.
      setEnabled(
          envDefaults.normal || debug.enabled('ChromeLauncher'),
          envDefaults.verbose || debug.enabled('ChromeLauncher:verbose'),
          envDefaults.warn || debug.enabled('ChromeLauncher:warn'),
          envDefaults.error || debug.enabled('ChromeLauncher:error'));
      return;
    }

    switch (level) {
      case 'silent':
        setEnabled(false, false, false, false);
        break;
      case 'verbose':
        setEnabled(true, true, true, true);
        break;
      case 'warn':
        setEnabled(false, false, true, true);
        break;
      case 'error':
        setEnabled(false, false, false, true);
        break;
      default:
        setEnabled(true, false, true, true);
    }
  },

  log(formatter: unknown, ...args: unknown[]) {
    logNormal(formatter, ...args);
  },

  verbose(formatter: unknown, ...args: unknown[]) {
    logVerbose(formatter, ...args);
  },

  warn(formatter: unknown, ...args: unknown[]) {
    logWarn(formatter, ...args);
  },

  error(formatter: unknown, ...args: unknown[]) {
    logError(formatter, ...args);
  },

  greenify(str: string) {
    return `\x1B[32m${str}\x1B[0m`;
  },

  get tick() {
    return isWindows ? '\u221A' : '✓';
  },
};

export default log;
