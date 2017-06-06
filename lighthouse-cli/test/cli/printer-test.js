/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

require('../../compiled-check.js')('printer.js');

/* eslint-env mocha */
const Printer = require('../../printer.js');
const assert = require('assert');
const fs = require('fs');
const sampleResults = require('../../../lighthouse-core/test/results/sample.json');

describe('Printer', () => {
  it('accepts valid output paths', () => {
    const path = '/path/to/output';
    assert.equal(Printer.checkOutputPath(path), path);
  });

  it('rejects invalid output paths', () => {
    const path = undefined;
    assert.notEqual(Printer.checkOutputPath(path), path);
  });

  it('creates JSON for results', () => {
    const mode = Printer.OutputMode.json;
    const jsonOutput = Printer.createOutput(sampleResults, mode);
    assert.doesNotThrow(_ => JSON.parse(jsonOutput));
  });

  it('creates HTML for results', () => {
    const mode = Printer.OutputMode.html;
    const htmlOutput = Printer.createOutput(sampleResults, mode);
    assert.ok(/<!doctype/gim.test(htmlOutput));
    assert.ok(/<html lang="en"/gim.test(htmlOutput));
  });

  it('writes file for results', () => {
    const mode = 'html';
    const path = './.test-file.html';

    // Now do a second pass where the file is written out.
    return Printer.write(sampleResults, mode, path).then(_ => {
      const fileContents = fs.readFileSync(path, 'utf8');
      assert.ok(/<!doctype/gim.test(fileContents));
      fs.unlinkSync(path);
    });
  });

  it('throws for invalid paths', () => {
    const mode = 'html';
    const path = '!/#@.html';
    return Printer.write(sampleResults, mode, path).catch(err => {
      assert.ok(err.code === 'ENOENT');
    });
  });

  it('writes extended info', () => {
    const mode = Printer.OutputMode.html;
    const htmlOutput = Printer.createOutput(sampleResults, mode);
    const outputCheck = new RegExp('dobetterweb/dbw_tester.css', 'i');

    assert.ok(outputCheck.test(htmlOutput));
  });
});
