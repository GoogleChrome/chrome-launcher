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

// Force yellow for warnings and red for errors in Node.
(logWarn as unknown as {color: number}).color = 3;
(logError as unknown as {color: number}).color = 1;

export type LogLevel = 'verbose'|'info'|'error'|'warn'|'silent'|'';

function setEnabled(
    normal: boolean|null, verbose: boolean|null, warn: boolean|null, error: boolean|null) {
  (logNormal as unknown as {enabled: boolean | null}).enabled = normal;
  (logVerbose as unknown as {enabled: boolean | null}).enabled = verbose;
  (logWarn as unknown as {enabled: boolean | null}).enabled = warn;
  (logError as unknown as {enabled: boolean | null}).enabled = error;
}

const log = {
  setLevel(level?: LogLevel) {
    if (level === undefined) {
      // Respect `DEBUG=ChromeLauncher*` when `logLevel` is not explicitly configured;
      // otherwise default to silent without clobbering global `debug` namespaces.
      if (debug.enabled('ChromeLauncher') || debug.enabled('ChromeLauncher:verbose') ||
          debug.enabled('ChromeLauncher:warn') || debug.enabled('ChromeLauncher:error')) {
        setEnabled(null, null, null, null);
      } else {
        setEnabled(false, false, false, false);
      }
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
