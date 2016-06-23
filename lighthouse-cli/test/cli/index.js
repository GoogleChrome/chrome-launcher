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

/* eslint-env mocha */
const assert = require('assert');
const childProcess = require('child_process');

describe('CLI Tests', function() {
  it('should list all audits and exit immediately after', () => {
    const output = JSON.parse(childProcess.execSync(
          'node lighthouse-cli/index.js https://example.com --list-all-audits').toString());
    assert(Array.isArray(output.audits));
    assert(output.audits.length > 0);
  });

  it('should print trace categories list-trace-categories flag and exit immediately after', () => {
    const output = JSON.parse(childProcess.execSync(
          'node lighthouse-cli/index.js https://example.com --list-trace-categories').toString());
    assert(Array.isArray(output.traceCategories));
    assert(output.traceCategories.length > 0);
  });
});

