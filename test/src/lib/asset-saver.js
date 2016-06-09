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

const assetSaver = require('../../../src/lib/asset-saver');
const assert = require('assert');
const fs = require('fs');

const screenshots = require('../../fixtures/traces/screenshots.json');
const traceContents = require('../../fixtures/traces/progressive-app.json');

/* eslint-env mocha */
describe('asset-saver helper', () => {
  it('generates HTML', () => {
    const options = {url: 'https://testexample.com'};
    const artifacts = {screenshots: [], traceContents: []};
    const output = assetSaver.prepareAssets(options, artifacts);
    assert.ok(/<!doctype/gim.test(output.html));
  });

  describe('saves files to disk with real filenames', function() {
    const options = {
      url: 'https://testexample.com/',
      date: new Date(1464737670547),
      flags: {
        saveAssets: true
      }
    };
    const artifacts = {
      traceContents,
      screenshots
    };

    assetSaver.saveAssets(options, artifacts);

    it('trace file saved to disk with data', () => {
      const traceFilename = assetSaver.getFilenamePrefix(options) + '.trace.json';
      const traceFileContents = fs.readFileSync(traceFilename, 'utf8');
      assert.ok(traceFileContents.length > 3000000);
      fs.unlinkSync(traceFilename);
    });

    it('screenshots file saved to disk with data', () => {
      const ssFilename = assetSaver.getFilenamePrefix(options) + '.screenshots.html';
      const ssFileContents = fs.readFileSync(ssFilename, 'utf8');
      assert.ok(/<!doctype/gim.test(ssFileContents));
      assert.ok(ssFileContents.includes('{"timestamp":674089419.919'));
      fs.unlinkSync(ssFilename);
    });
  });
});
