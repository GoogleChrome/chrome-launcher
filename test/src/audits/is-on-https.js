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
const Audit = require('../../../src/audits/is-on-https.js');
const assert = require('assert');

/* global describe, it*/

describe('Security: HTTPS audit', () => {
  it('fails when no input present', () => {
    return assert.equal(Audit.audit({}).value, false);
  });

  it('fails when not on HTTPS', () => {
    return assert.equal(Audit.audit({
      HTTPS: false
    }).value, false);
  });

  it('passes when on HTTPS', () => {
    return assert.equal(Audit.audit({
      HTTPS: true
    }).value, true);
  });
});
