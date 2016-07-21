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
const assert = require('assert');

/* global describe, it*/

describe('Mobile-friendly: display audit', () => {
  it('only accepts when a value is set for the display prop', () => {
    assert.equal(Audit.hasRecommendedValue('fullscreen'), true);
    assert.equal(Audit.hasRecommendedValue('standalone'), true);
    assert.equal(Audit.hasRecommendedValue('browser'), true);
    assert.equal(Audit.hasRecommendedValue(undefined), false);
  });

  it('handles the case where there is no display property', () => {
    const output = Audit.audit({Manifest: {}});

    assert.equal(output.score, false);
    assert.equal(output.displayValue, '');
    assert.equal(output.rawValue, false);
  });

  it('audits a manifest\'s display property', () => {
    const expected = 'standalone';
    const output = Audit.audit({
      Manifest: {
        value: {
          display: {
            value: expected
          }
        }
      }
    });

    assert.equal(output.score, true);
    assert.equal(output.displayValue, expected);
    assert.equal(output.rawValue, true);
  });
});
