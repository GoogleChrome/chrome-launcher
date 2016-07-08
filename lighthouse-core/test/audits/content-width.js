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
const Audit = require('../../audits/content-width.js');
const assert = require('assert');

/* global describe, it*/

describe('Mobile-friendly: content-width audit', () => {
  it('fails when no input present', () => {
    return assert.equal(Audit.audit({}).rawValue, false);
  });

  it('fails when scroll width differs from viewport width', () => {
    return assert.equal(Audit.audit({
      ContentWidth: {
        scrollWidth: 100,
        viewportWidth: 300
      }
    }).rawValue, false);
  });

  it('passes when widths match', () => {
    return assert.equal(Audit.audit({
      ContentWidth: {
        scrollWidth: 300,
        viewportWidth: 300
      }
    }).rawValue, true);
  });
});
