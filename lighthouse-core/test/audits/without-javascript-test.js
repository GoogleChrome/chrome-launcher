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

/* eslint-env mocha */

const withoutJsAudit = require('../../audits/without-javascript.js');
const assert = require('assert');

describe('Progressive Enhancement: without javascript audit', () => {
  it('passes on the error when there was a driver error', () => {
    const debugString = 'Unusual error string';
    const artifacts = {
      HTMLWithoutJavaScript: {
        value: -1,
        debugString
      }
    };

    const result = withoutJsAudit.audit(artifacts);
    assert.equal(result.score, -1);
    assert.equal(result.debugString, debugString);
  });

  it('does not error on non-string input', () => {
    const artifacts = {
      HTMLWithoutJavaScript: {
        value: {}
      }
    };

    const result = withoutJsAudit.audit(artifacts);
    assert.equal(result.score, -1);
    assert.ok(result.debugString);
  });

  it('fails when the js-less body is empty', () => {
    const artifacts = {
      HTMLWithoutJavaScript: {
        value: ''
      }
    };

    const result = withoutJsAudit.audit(artifacts);
    assert.equal(result.score, false);
    assert.ok(result.debugString);
  });

  it('fails when the js-less body is whitespace', () => {
    const artifacts = {
      HTMLWithoutJavaScript: {
        value: '        '
      }
    };

    const result = withoutJsAudit.audit(artifacts);
    assert.equal(result.score, false);
    assert.ok(result.debugString);
  });

  it('succeeds when the js-less body contains some content', () => {
    const artifacts = {
      HTMLWithoutJavaScript: {
        value: 'test'
      }
    };

    assert.equal(withoutJsAudit.audit(artifacts).score, true);
  });
});
