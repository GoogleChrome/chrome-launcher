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

const ReportGenerator = require('../../report/report-generator.js');
const sampleResults = require('../results/sample.json');
const assert = require('assert');

/* eslint-env mocha */

// Most of the functionality is tested via the Printer class, but in this
// particular case, we need to test the functionality that would be branched for
// the extension, which is relatively minor stuff.
describe('Report', () => {
  it('generates CLI HTML', () => {
    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(sampleResults);
    assert.ok(/<script>/gim.test(html));
  });

  it('should format generated Time', () => {
    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(sampleResults);
    assert.ok(/on 11\/\d{1,2}\/2016\, /gim.test(html));
  });

  it('should escape closing </script> tags', () => {
    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(sampleResults);
    assert.ok(/<\/script>/gim.test(html));
  });

  it('sets report context in HTML', () => {
    const reportGenerator = new ReportGenerator();
    let html = reportGenerator.generateHTML(sampleResults);
    assert.ok(html.includes('data-report-context="extension"'),
              'default report context is "extension"');
    html = reportGenerator.generateHTML(sampleResults, 'viewer');
    assert.ok(html.includes('<html data-report-context="viewer"'), 'viewer report context');
  });

  it('generates HTML', () => {
    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(sampleResults);

    assert.ok(html.includes('self.lhresults = {'), 'results object was not added');
    assert.ok(html.includes('<footer'), 'no footer tag found');
    assert.ok(html.includes('printButton = document.querySelector'),
              'lighthouse-report.js was not inlined');
    assert.ok(html.includes('.report-body {'), 'report.css was not inlined');
    assert.ok(!html.includes('&quot;lighthouseVersion'), 'lhresults were not escaped');
    assert.ok(/Version: x\.x\.x/g.test(html), 'Version doesn\'t appear in report');
  });
});
