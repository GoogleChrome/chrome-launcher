/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/is-on-https.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Security: HTTPS audit', () => {
  function getArtifacts(networkRecords) {
    return {
      devtoolsLogs: {[Audit.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords)
    };
  }

  it('fails when there is more than one insecure record', () => {
    return Audit.audit(getArtifacts([
      {url: 'https://google.com/', scheme: 'https', domain: 'google.com'},
      {url: 'http://insecure.com/image.jpeg', scheme: 'http', domain: 'insecure.com'},
      {url: 'http://insecure.com/image2.jpeg', scheme: 'http', domain: 'insecure.com'},
      {url: 'https://google.com/', scheme: 'https', domain: 'google.com'},
    ])).then(result => {
      assert.strictEqual(result.rawValue, false);
      assert.ok(result.displayValue.includes('requests found'));
      assert.strictEqual(result.extendedInfo.value.length, 2);
    });
  });

  it('fails when there is one insecure record', () => {
    return Audit.audit(getArtifacts([
      {url: 'https://google.com/', scheme: 'https', domain: 'google.com'},
      {url: 'http://insecure.com/image.jpeg', scheme: 'http', domain: 'insecure.com'},
      {url: 'https://google.com/', scheme: 'https', domain: 'google.com'},
    ])).then(result => {
      assert.strictEqual(result.rawValue, false);
      assert.ok(result.displayValue.includes('request found'));
      assert.deepEqual(result.extendedInfo.value[0], {url: 'http://insecure.com/image.jpeg'});
    });
  });

  it('passes when all records are secure', () => {
    return Audit.audit(getArtifacts([
      {url: 'https://google.com/', scheme: 'https', domain: 'google.com'},
      {url: 'http://localhost/image.jpeg', scheme: 'http', domain: 'localhost'},
      {url: 'https://google.com/', scheme: 'https', domain: 'google.com'},
    ])).then(result => {
      assert.strictEqual(result.rawValue, true);
    });
  });

  describe('#isSecureRecord', () => {
    it('correctly identifies insecure records', () => {
      assert.strictEqual(Audit.isSecureRecord({scheme: 'http', domain: 'google.com'}), false);
      assert.strictEqual(Audit.isSecureRecord({scheme: 'http', domain: '54.33.21.23'}), false);
      assert.strictEqual(Audit.isSecureRecord({scheme: 'ws', domain: 'my-service.com'}), false);
      assert.strictEqual(Audit.isSecureRecord({scheme: '', domain: 'google.com'}), false);
    });

    it('correctly identifies secure records', () => {
      assert.strictEqual(Audit.isSecureRecord({scheme: 'http', domain: 'localhost'}), true);
      assert.strictEqual(Audit.isSecureRecord({scheme: 'https', domain: 'google.com'}), true);
      assert.strictEqual(Audit.isSecureRecord({scheme: 'wss', domain: 'my-service.com'}), true);
      assert.strictEqual(Audit.isSecureRecord({scheme: 'data', domain: ''}), true);
      assert.strictEqual(Audit.isSecureRecord({scheme: 'blob', domain: ''}), true);
      assert.strictEqual(Audit.isSecureRecord({scheme: 'chrome', domain: ''}), true);
      assert.strictEqual(Audit.isSecureRecord({scheme: 'chrome-extension', domain: ''}), true);
    });
  });
});
