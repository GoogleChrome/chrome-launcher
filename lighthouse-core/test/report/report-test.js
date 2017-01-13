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

  it('adds export button for viewer context', () => {
    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(sampleResults, 'viewer');
    assert.ok(!html.includes('<button class="print js-print'),
                             'viewer report does not contain print button');
  });

  it('generates HTML', () => {
    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(sampleResults);

    assert.ok(html.includes('<footer'), 'no footer tag found');
    assert.ok(html.includes('<div id="lhresults-dump">'), 'report results were inlined');
    assert.ok(html.includes('window.lhresults = JSON.parse('), 'lhresults created');
    assert.ok(html.includes('.report-body {'), 'report.css inlined');
    assert.ok(html.includes('&quot;lighthouseVersion'), 'lhresults were escaped');
    assert.ok(/Version: x\.x\.x/g.test(html), 'Version doesn\'t appear in report');
    assert.ok(html.includes('export-button'), 'page includes export button');

    assert.ok(html.includes('printButton = document.querySelector'),
                            'print button functionality attached');
    assert.ok(html.includes('openButton = document.querySelector'),
                            'open button functionality attached');
    assert.ok(html.includes('share js-share'), 'has share button');
    assert.ok(html.includes('copy js-copy'), 'has copy button');
    assert.ok(html.includes('open js-open'), 'has open button');
    assert.ok(html.includes('print js-print'), 'has print button');
  });

  it('does not include script for devtools', () => {
    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(sampleResults, 'devtools');

    assert.ok(!html.includes('<script'), 'script tag inlined');
    assert.ok(!html.includes('<div id="lhresults-dump">'), 'report results were inlined');
    assert.ok(!html.includes('window.lhresults = JSON.parse('), 'lhresults created');
  });

  it('sanitizes JSON input', () => {
    const modifiedResults = Object.assign({}, sampleResults);

    const item = {
      score: false,
      displayValue: '',
      rawValue: false,
      name: 'bad-actor-audit-name',
      category: 'Fake Audit Aggregation',
      description: 'Report does not inject unknown HTML but `renders code`',
      helpText: '`Code like this` and [links](http://example.com) should be transformed. ' +
          'but images (<img src="test.gif" onerror="alert(10)">) and <b>html should not</b>.'
    };

    modifiedResults.audits['bad-actor-audit-name'] = item;

    modifiedResults.aggregations.push({
      name: 'Fake Audit Aggregation',
      score: [{
        overall: 0,
        name: 'Blah blah',
        description: item.description,
        subItems: [item]
      }]
    });


    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(modifiedResults);

    assert.ok(html.includes('but <code>renders code</code>'), 'code blocks transformed');
    assert.ok(html.includes('<code>Code like this</code>'), 'code blocks transformed');
    assert.ok(html.includes(
        '<a href="http://example.com" target="_blank" rel="noopener" title="links">links</a>'),
        'anchors are transformed');
    assert.ok(!html.includes(
        '<img src="test.gif" onerror="alert(10)">'), 'non-recognized HTML is sanitized');
  });
});
