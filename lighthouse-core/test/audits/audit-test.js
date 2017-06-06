/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/audit.js');
const assert = require('assert');

/* eslint-env mocha */

// Extend the Audit class but fail to implement meta. It should throw errors.
class A extends Audit {}
class B extends Audit {
  static get meta() {
    return {};
  }

  static audit() {}
}

describe('Audit', () => {
  it('throws if an audit does not override the meta', () => {
    assert.throws(_ => A.meta);
  });

  it('does not throw if an audit overrides the meta', () => {
    assert.doesNotThrow(_ => B.meta);
  });

  it('throws if an audit does not override audit()', () => {
    assert.throws(_ => A.audit());
  });

  it('does not throw if an audit overrides audit()', () => {
    assert.doesNotThrow(_ => B.audit());
  });

  it('throws if an audit does return a result with a rawValue', () => {
    assert.throws(_ => Audit.generateAuditResult(A, {}));
  });
});
