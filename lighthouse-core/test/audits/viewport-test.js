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
    return assert.equal(Audit.audit({
      Viewport: -1
    }).rawValue, false);
  });

  it('fails when HTML does not contain a viewport meta tag', () => {
    return assert.equal(Audit.audit({
      Viewport: ''
    }).rawValue, false);
  });

  it('passes when a viewport is provided', () => {
    return assert.equal(Audit.audit({
      Viewport: 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1'
    }).rawValue, true);
  });
});
