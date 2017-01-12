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

const Audit = require('../../audits/viewport.js');
const assert = require('assert');

/* global describe, it*/

describe('Mobile-friendly: viewport audit', () => {
  it('fails when no input present', () => {
    const audit = Audit.audit({
      Viewport: -1
    });
    assert.equal(audit.rawValue, -1);
    assert.equal(audit.debugString, 'Error in determining viewport');
  });

  it('fails when HTML does not contain a viewport meta tag', () => {
    return assert.equal(Audit.audit({
      Viewport: ''
    }).rawValue, false);
  });

  it('fails when HTML contains a non-mobile friendly viewport meta tag', () => {
    const viewport = 'maximum-scale=1';
    assert.equal(Audit.audit({Viewport: viewport}).rawValue, false);
    assert.equal(Audit.audit({
      Viewport: viewport
    }).debugString, '');
  });

  it('fails when HTML contains an invalid viewport meta tag key', () => {
    const viewport = 'nonsense=true';
    assert.equal(Audit.audit({Viewport: viewport}).rawValue, false);
    assert.equal(Audit.audit({
      Viewport: viewport
    }).debugString, 'Invalid properties found: {"nonsense":"true"}.');
  });

  it('fails when HTML contains an invalid viewport meta tag value', () => {
    const viewport = 'initial-scale=microscopic';
    assert.equal(Audit.audit({Viewport: viewport}).rawValue, false);
    assert.equal(Audit.audit({
      Viewport: viewport
    }).debugString, 'Invalid values found: {"initial-scale":"microscopic"}.');
  });

  it('fails when HTML contains an invalid viewport meta tag key and value', () => {
    const viewport = 'nonsense=true, initial-scale=microscopic';
    assert.equal(Audit.audit({Viewport: viewport}).rawValue, false);
    assert.equal(Audit.audit({
      Viewport: viewport
    }).debugString, 'Invalid properties found: {"nonsense":"true"}. ' +
        'Invalid values found: {"initial-scale":"microscopic"}.');
  });

  it('passes when a valid viewport is provided', () => {
    const viewports = [
      'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1',
      'width = device-width, initial-scale = 1',
      'initial-scale=1',
      'width=device-width     ',
    ];
    viewports.forEach(viewport => {
      assert.equal(Audit.audit({
        Viewport: viewport
      }).rawValue, true);
    });
  });
});
