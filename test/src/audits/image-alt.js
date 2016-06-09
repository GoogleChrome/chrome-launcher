/**
 * @license
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
const Audit = require('../../../src/audits/image-alt.js');
const assert = require('assert');

/* global describe, it*/

describe('Accessibility: image-alt audit', () => {
  it('handles empty rules', () => {
    const output = Audit.createDebugString();
    assert.ok(typeof output === 'string');
  });

  it('creates debug strings', () => {
    const emptyAudit = Audit.createDebugString({
      nodes: [],
      help: 'http://example.com/'
    });

    assert.equal(emptyAudit, 'http://example.com/ (Failed on 0 elements)');
  });

  it('generates an audit output', () => {
    const artifacts = {
      Accessibility: {
        violations: [{
          id: 'image-alt',
          nodes: [],
          help: 'http://example.com/'
        }]
      }
    };

    const output = Audit.audit(artifacts);
    assert.equal(output.value, false);
    assert.equal(output.debugString, 'http://example.com/ (Failed on 0 elements)');
  });

  it('generates an audit output (single node)', () => {
    const artifacts = {
      Accessibility: {
        violations: [{
          id: 'image-alt',
          nodes: [{}],
          help: 'http://example.com/'
        }]
      }
    };

    const output = Audit.audit(artifacts);
    assert.equal(output.value, false);
    assert.equal(output.debugString, 'http://example.com/ (Failed on 1 element)');
  });
});
