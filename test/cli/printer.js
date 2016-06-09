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

const Printer = require('../../cli/printer.js');
const assert = require('assert');
const fs = require('fs');
const sampleResults = require('../results/sample.json');

/* global describe, it */

describe('Printer', () => {
  it('accepts valid output modes', () => {
    const mode = 'json';
    assert.equal(Printer.checkOutputMode(mode), mode);
  });

  it('rejects invalid output modes', () => {
    const mode = 'bacon';
    assert.notEqual(Printer.checkOutputMode(mode), mode);
  });

  it('accepts valid output paths', () => {
    const path = '/path/to/output';
    assert.equal(Printer.checkOutputPath(path), path);
  });

  it('rejects invalid output paths', () => {
    const path = undefined;
    assert.notEqual(Printer.checkOutputPath(path), path);
  });

  it('creates JSON for results', () => {
    const mode = 'json';
    const jsonOutput = Printer.createOutput(sampleResults, mode);
    assert.doesNotThrow(_ => JSON.parse(jsonOutput));
  });

  it('creates Pretty Printed results', () => {
    const mode = 'pretty';
    const prettyOutput = Printer.createOutput(sampleResults, mode);

    // Just check there's no HTML / JSON there.
    assert.throws(_ => JSON.parse(prettyOutput));
    assert.equal(/<!doctype/gim.test(prettyOutput), false);
  });

  it('creates HTML for results', () => {
    const mode = 'html';
    const htmlOutput = Printer.createOutput(sampleResults, mode);
    assert(/<!doctype/gim.test(htmlOutput));
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

  it('throws for invalid paths', done => {
    const mode = 'html';
    const path = '!/#@.html';
    return Printer.write(sampleResults, mode, path).catch(err => {
      assert(err.code === 'ENOENT');
      done();
    });
  });

  it('writes extended info', () => {
    const mode = 'pretty';
    const prettyOutput = Printer.createOutput(sampleResults, mode);

    assert.ok(/━━ images\/chrome-touch-icon-384x384.png/i.test(prettyOutput));
  });
});
