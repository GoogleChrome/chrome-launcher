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
const Audit = require('../../audits/manifest-display.js');
const manifestParser = require('../../lib/manifest-parser');
const assert = require('assert');

const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const exampleManifest = manifestParser(manifestSrc);

/* global describe, it*/

describe('Mobile-friendly: display audit', () => {
  it('only accepts when a value is set for the display prop', () => {
    assert.equal(Audit.hasRecommendedValue('fullscreen'), true);
    assert.equal(Audit.hasRecommendedValue('standalone'), true);
    assert.equal(Audit.hasRecommendedValue('browser'), true);
    assert.equal(Audit.hasRecommendedValue(undefined), false);
  });

  it('fails when no manifest artifact present', () => {
    return assert.equal(Audit.audit({Manifest: {
      value: undefined
    }}).rawValue, false);
  });

  it('handles the case where there is no manifest display property', () => {
    const artifacts = {
      Manifest: manifestParser({})
    };
    const output = Audit.audit(artifacts);

    assert.equal(output.score, false);
    assert.equal(output.displayValue, '');
    assert.equal(output.rawValue, false);
  });

  it('succeeds when a manifest has a display property', () => {
    const artifacts = {
      Manifest: manifestParser(JSON.stringify({
        display: 'standalone'
      }))
    };
    const output = Audit.audit(artifacts);
    assert.equal(output.score, true);
    assert.equal(output.displayValue, 'standalone');
    assert.equal(output.rawValue, true);
  });

  it('succeeds when a complete manifest contains a display property', () => {
    return assert.equal(Audit.audit({Manifest: exampleManifest}).rawValue, true);
  });
});
