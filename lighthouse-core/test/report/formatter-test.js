/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Formatter = require('../../report/formatter.js');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

/* eslint-env mocha */

describe('Formatter', () => {
  it('returns supported formats', () => {
    assert.ok(Formatter.SUPPORTED_FORMATS);
  });

  it('maps supported format constants to partial filenames', () => {
    Object.keys(Formatter.SUPPORTED_FORMATS).forEach(capsName => {
      const baseName = Formatter.SUPPORTED_FORMATS[capsName];
      const filePath = path.normalize(`${__dirname}/../../report/partials/${baseName}.html`);
      assert.doesNotThrow(_ => fs.accessSync(filePath), `partial at '${filePath}' not found`);
    });
  });
});
