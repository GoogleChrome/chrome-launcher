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
const Audit = require('../../audits/manifest-background-color.js');
const assert = require('assert');
const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const manifestParser = require('../../lib/manifest-parser');
const exampleManifest = manifestParser(manifestSrc);


/* global describe, it*/

// Need to disable camelcase check for dealing with background_color.
/* eslint-disable camelcase */
describe('Manifest: background color audit', () => {
  it('fails when no manifest artifact present', () => {
    return assert.equal(Audit.audit({Manifest: {
      value: undefined
    }}).rawValue, false);
  });

  it('fails when an empty manifest is present', () => {
    const artifacts = {
      Manifest: manifestParser('{}')
    };
    return assert.equal(Audit.audit(artifacts).rawValue, false);
  });

  it('fails when a minimal manifest contains no background_color', () => {
    const artifacts = {
      Manifest: manifestParser(JSON.stringify({
        start_url: '/'
      }))
    };
    return assert.equal(Audit.audit(artifacts).rawValue, false);
  });

  it('fails when a minimal manifest contains an invalid background_color', () => {
    const artifacts = {
      Manifest: manifestParser(JSON.stringify({
        background_color: 'no'
      }))
    };
    return assert.equal(Audit.audit(artifacts).rawValue, false);
  });

  it('succeeds when a minimal manifest contains a valid background_color', () => {
    const artifacts = {
      Manifest: manifestParser(JSON.stringify({
        background_color: '#FAFAFA'
      }))
    };
    const output = Audit.audit(artifacts);
    assert.equal(output.rawValue, true);
    assert.equal(output.extendedInfo.value.color, '#FAFAFA');
  });

  it('succeeds when a complete manifest contains a background_color', () => {
    return assert.equal(Audit.audit({Manifest: exampleManifest}).rawValue, true);
  });
});
/* eslint-enable */
