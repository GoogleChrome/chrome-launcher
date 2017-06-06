/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const Runner = require('../../runner.js');
const ScreenshotThumbnailsAudit = require('../../audits/screenshot-thumbnails');
const TTFIAudit = require('../../audits/first-interactive');
const TTCIAudit = require('../../audits/consistently-interactive');
const pwaTrace = require('../fixtures/traces/progressive-app-m60.json');

/* eslint-env mocha */

describe('Screenshot thumbnails', () => {
  let computedArtifacts;
  let ttfiOrig;
  let ttciOrig;
  let ttfiReturn;
  let ttciReturn;

  before(() => {
    computedArtifacts = Runner.instantiateComputedArtifacts();

    // Monkey patch TTFI to simulate result
    ttfiOrig = TTFIAudit.audit;
    ttciOrig = TTCIAudit.audit;
    TTFIAudit.audit = () => ttfiReturn || Promise.reject(new Error('oops!'));
    TTCIAudit.audit = () => ttciReturn || Promise.reject(new Error('oops!'));
  });

  after(() => {
    TTFIAudit.audit = ttfiOrig;
    TTCIAudit.audit = ttciOrig;
  });

  beforeEach(() => {
    ttfiReturn = null;
    ttciReturn = null;
  });

  it('should extract thumbnails from a trace', () => {
    const artifacts = Object.assign({
      traces: {defaultPass: pwaTrace}
    }, computedArtifacts);

    return ScreenshotThumbnailsAudit.audit(artifacts).then(results => {
      results.details.items.forEach((result, index) => {
        const framePath = path.join(__dirname,
            `../fixtures/traces/screenshots/progressive-app-frame-${index}.jpg`);
        const expectedData = fs.readFileSync(framePath, 'base64');
        assert.equal(expectedData.length, result.data.length);
      });

      assert.ok(results.rawValue);
      assert.equal(results.details.items[0].timing, 82);
      assert.equal(results.details.items[2].timing, 245);
      assert.equal(results.details.items[9].timing, 818);
      assert.equal(results.details.items[0].timestamp, 225414253815);
    });
  });

  it('should scale the timeline to TTFI', () => {
    const artifacts = Object.assign({
      traces: {defaultPass: pwaTrace}
    }, computedArtifacts);

    ttfiReturn = Promise.resolve({rawValue: 4000});
    return ScreenshotThumbnailsAudit.audit(artifacts).then(results => {
      assert.equal(results.details.items[0].timing, 400);
      assert.equal(results.details.items[9].timing, 4000);
      const extrapolatedFrames = new Set(results.details.items.slice(3).map(f => f.data));
      assert.ok(results.details.items[9].data.length > 100, 'did not have last frame');
      assert.ok(extrapolatedFrames.size === 1, 'did not extrapolate last frame');
    });
  });

  it('should scale the timeline to TTCI', () => {
    const artifacts = Object.assign({
      traces: {defaultPass: pwaTrace}
    }, computedArtifacts);

    ttfiReturn = Promise.resolve({rawValue: 8000});
    ttciReturn = Promise.resolve({rawValue: 20000});
    return ScreenshotThumbnailsAudit.audit(artifacts).then(results => {
      assert.equal(results.details.items[0].timing, 2000);
      assert.equal(results.details.items[9].timing, 20000);
      const extrapolatedFrames = new Set(results.details.items.map(f => f.data));
      assert.ok(results.details.items[9].data.length > 100, 'did not have last frame');
      assert.ok(extrapolatedFrames.size === 1, 'did not extrapolate last frame');
    });
  });
});
