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
const Audit = require('../../audits/cache-start-url.js');
const assert = require('assert');
const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const manifestParser = require('../../lib/manifest-parser');
const Manifest = manifestParser(manifestSrc);
const CacheContents = ['https://another.example.com/', 'https://example.com/'];
const URL = 'https://example.com';
const AltURL = 'https://example.com/?utm_source=http203';

/* global describe, it*/

describe('Cache: start_url audit', () => {
  it('fails when no manifest present', () => {
    return assert.equal(Audit.audit({Manifest: {
      value: undefined
    }}).rawValue, false);
  });

  it('fails when an empty manifest is present', () => {
    return assert.equal(Audit.audit({Manifest: {}}).rawValue, false);
  });

  it('fails when no cache contents given', () => {
    return assert.equal(Audit.audit({Manifest, URL}).rawValue, false);
  });

  it('fails when no URL given', () => {
    return assert.equal(Audit.audit({Manifest, CacheContents}).rawValue, false);
  });

  // Need to disable camelcase check for dealing with short_name.
  /* eslint-disable camelcase */
  it('fails when a manifest contains no start_url', () => {
    const inputs = {
      Manifest: {
        start_url: null
      }
    };

    return assert.equal(Audit.audit(inputs).rawValue, false);
  });

  /* eslint-enable camelcase */

  it('succeeds when given a manifest with a start_url, cache contents, and a URL', () => {
    return assert.equal(Audit.audit({
      Manifest,
      CacheContents,
      URL
    }).rawValue, true);
  });

  it('handles URLs with utm params', () => {
    return assert.equal(Audit.audit({
      Manifest,
      CacheContents,
      URL: AltURL
    }).rawValue, true);
  });
});
