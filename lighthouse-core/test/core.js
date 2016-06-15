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
const Core = require('../core');
const assert = require('assert');

/* global describe, it*/

describe('Core', () => {
  it('maps all audits to an array of Promises', () => {
    return Core
      .audit([{}], ['is-on-https'])
      .then(modifiedResults => {
        assert.ok(Array.isArray(modifiedResults));
        assert.equal(modifiedResults.length, 1);
      });
  });

  it('handles non-existent audits when expanding', () => {
    const modifiedResults = Core.expandAudits();

    return assert.equal(modifiedResults, undefined);
  });

  it('expands audits', () => {
    const modifiedResults = Core.expandAudits(['is-on-https']);

    assert.ok(Array.isArray(modifiedResults));
    assert.equal(modifiedResults.length, 1);
    return assert.equal(typeof modifiedResults[0], 'function');
  });

  it('handles non-existent audits when filtering', () => {
    const modifiedResults = Core.filterAudits(undefined, ['a']);

    return assert.equal(modifiedResults, undefined);
  });

  it('returns unfiltered audits when no whitelist is given', () => {
    const modifiedResults = Core.filterAudits(['is-on-https']);

    assert.ok(Array.isArray(modifiedResults));
    assert.equal(modifiedResults.length, 1);
    return assert.equal(modifiedResults[0], 'is-on-https');
  });

  it('returns filtered audits when a whitelist is given', () => {
    const modifiedResults = Core.filterAudits(['is-on-https'], new Set(['b']));

    assert.ok(Array.isArray(modifiedResults));
    return assert.equal(modifiedResults.length, 0);
  });
});
