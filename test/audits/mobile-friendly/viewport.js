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
const Audit = require('../../../audits/mobile-friendly/viewport.js');
const assert = require('assert');

/* global describe, it*/

// Need to disable camelcase check for dealing with background_color.
/* eslint-disable camelcase */
describe('Mobile-friendly: viewport audit', () => {
  it('fails when no input present', () => {
    return assert.equal(Audit.audit({}).value, false);
  });

  it('fails when invalid HTML given', () => {
    return assert.equal(Audit.audit({
      html: null
    }).value, false);
  });

  it('fails when HTML does not contain a viewport meta tag', () => {
    return assert.equal(Audit.audit({
      html: ''
    }).value, false);
  });

  it('passes when a viewport is provided', () => {
    return assert.equal(Audit.audit({
      html: `<!doctype html>
             <html>
             <head>
               <meta name="viewport" content="width=device-width">
               <title>Sample page</title>
             </head>
             <body></body>
             </html>`
    }).value, true);
  });

  // TODO: add test for ensuring the meta tag is in the head.
});
/* eslint-enable */
