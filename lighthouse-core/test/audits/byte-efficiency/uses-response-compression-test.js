/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const KB_BYTES = 1024;
const ResponsesAreCompressedAudit =
  require('../../../audits/byte-efficiency/uses-request-compression.js');
const assert = require('assert');

function generateResponse(filename, type, originalSize, gzipSize) {
  return {
    url: `http://google.com/${filename}`,
    mimeType: `${type}`,
    resourceSize: originalSize,
    gzipSize,
  };
}

/* eslint-env mocha */

describe('Page uses optimized responses', () => {
  it('fails when responses are collectively unoptimized', () => {
    const auditResult = ResponsesAreCompressedAudit.audit_({
      ResponseCompression: [
        generateResponse('index.js', 'text/javascript', 100 * KB_BYTES, 90 * KB_BYTES), // 10kb & 10%
        generateResponse('index.css', 'text/css', 50 * KB_BYTES, 37 * KB_BYTES), //  13kb & 26% (hit)
        generateResponse('index.json', 'application/json', 2048 * KB_BYTES, 1024 * KB_BYTES), // 1024kb & 50% (hit)
      ],
    });

    assert.equal(auditResult.results.length, 2);
  });

  it('passes when all responses are sufficiently optimized', () => {
    const auditResult = ResponsesAreCompressedAudit.audit_({
      ResponseCompression: [
        generateResponse('index.js', 'text/javascript', 1000 * KB_BYTES, 910 * KB_BYTES), // 90kb & 9%
        generateResponse('index.css', 'text/css', 6 * KB_BYTES, 4.5 * KB_BYTES), // 1,5kb & 25% (hit)
        generateResponse('index.json', 'application/json', 10 * KB_BYTES, 10 * KB_BYTES), // 0kb & 0%
      ],
    });

    assert.equal(auditResult.results.length, 1);
  });
});
