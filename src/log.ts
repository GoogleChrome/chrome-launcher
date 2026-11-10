/**
 * @license Copyright 2026 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {debuglog} from 'node:util';

/**
 * Receives the launcher's log messages. `console` satisfies this interface, so
 * `launch({logger: console})` prints everything.
 */
export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

const section = debuglog('chrome-launcher');
const verboseSection = debuglog('chrome-launcher:verbose');

/**
 * Silent unless enabled with the NODE_DEBUG environment variable:
 *   NODE_DEBUG=chrome-launcher     info, warnings and errors
 *   NODE_DEBUG='chrome-launcher*'  the above plus debug messages
 */
export const defaultLogger: Logger = {
  debug: message => verboseSection('%s', message),
  info: message => section('%s', message),
  warn: message => section('warning: %s', message),
  error: message => section('error: %s', message),
};
