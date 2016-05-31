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
const Audit = require('../../../src/audits/audit.js');
const assert = require('assert');

/* global describe, it*/
describe('Audit', () => {
  it('throws when category is called directly', () => {
    assert.throws(_ => Audit.meta.category);
  });

  it('throws when name is called directly', () => {
    assert.throws(_ => Audit.meta.name);
  });

  it('throws when description is called directly', () => {
    assert.throws(_ => Audit.meta.description);
  });

  it('returns undefined when optimalValue is called directly', () => {
    assert.equal(Audit.meta.optimalValue, undefined);
  });

  it('throws when requiredArtifacts is called directly', () => {
    assert.throws(_ => Audit.meta.requiredArtifacts);
  });

  it('throws when generateAuditResult is called without a value', () => {
    assert.throws(_ => Audit.generateAuditResult({
      result: {}
    }));
  });
});
