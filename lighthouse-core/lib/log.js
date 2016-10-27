/**
 * @license
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

const debug = require('debug');
const EventEmitter = require('events').EventEmitter;

const loggersByTitle = {};
const loggingBufferColumns = 25;

function setLevel(level) {
  switch (level) {
    case 'verbose':
      debug.enable('*');
      break;
    case 'error':
      debug.enable('*:error');
      break;
    default:
      debug.enable('*, -*:verbose');
  }
}

function _log(title, ...logargs) {
  if (!loggersByTitle[title]) {
    loggersByTitle[title] = debug(title);
  }
  return loggersByTitle[title](...logargs);
}

class Emitter extends EventEmitter {
  /**
   * Fires off all status updates. Listen with
   * `require('lib/log').events.addListener('status', callback)`
   */
  issueStatus(title, args) {
    if (title === 'status' || title === 'statusEnd') {
      this.emit(title, args);
    }
  }

  /**
   * Fires off all warnings. Listen with
   * `require('lib/log').events.addListener('warning', callback)`
   */
  issueWarning(args) {
    this.emit('warning', args);
  }
}

/**
 * A simple formatting utility for event logging.
 * @param {string} prefix
 * @param {!Object} data A JSON-serializable object of event data to log.
 * @param {string=} level Optional logging level. Defaults to 'log'.
 */
function formatProtocol(prefix, data, level) {
  const columns = (!process || process.browser) ? Infinity : process.stdout.columns;
  const maxLength = columns - data.method.length - prefix.length - loggingBufferColumns;
  // IO.read blacklisted here to avoid logging megabytes of trace data
  const snippet = (data.params && data.method !== 'IO.read') ?
      JSON.stringify(data.params).substr(0, maxLength) : '';
  level = level || 'log';
  _log(`${prefix}:${level}`, data.method, snippet);
}

module.exports = {
  setLevel,
  formatProtocol,
  events: new Emitter(),
  log(title, ...args) {
    this.events.issueStatus(title, ...args);
    return _log(title, ...args);
  },

  warn(title, ...args) {
    this.events.issueWarning(title, ...args);
    return _log(`${title}:warn`, ...args);
  },

  error(title, ...args) {
    return _log(`${title}:error`, ...args);
  },

  verbose(title, ...args) {
    this.events.issueStatus(title, ...args);
    return _log(`${title}:verbose`, ...args);
  }
};
