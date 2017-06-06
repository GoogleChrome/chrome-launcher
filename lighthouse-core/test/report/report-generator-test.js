/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ReportGenerator = require('../../report/report-generator.js');
const sampleResults = require('../results/sample.json');
const assert = require('assert');
const Formatter = require('../../report/formatter');
const Handlebars = require('handlebars/runtime');

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
    assert.ok(/on: 2\/\d{1,2}\/2017\, /gim.test(html));
  });

  it('should escape closing </script> tags', () => {
    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(sampleResults);
    assert.ok(/<\/script>/gim.test(html));
  });

  it('`nameToLink` works properly', () => {
    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(sampleResults);
    assert.ok(/class="menu__link" href="#progressive-web-app"/gm.test(html));
    assert.ok(/id="progressive-web-app"/gm.test(html));
  });

  it('sets report context in HTML', () => {
    const reportGenerator = new ReportGenerator();
    let html = reportGenerator.generateHTML(sampleResults);
    assert.ok(html.includes('data-report-context="extension"'),
              'default report context is "extension"');
    html = reportGenerator.generateHTML(sampleResults, 'viewer');
    assert.ok(html.includes('<html lang="en" data-report-context="viewer"'),
              'viewer report context');
  });

  it('adds export button', () => {
    const reportGenerator = new ReportGenerator();
    let html = reportGenerator.generateHTML(sampleResults, 'viewer');
    assert.ok(!html.includes('data-action="open-viewer"'),
                             'viewer context does not contain open in viewer button');
    html = reportGenerator.generateHTML(sampleResults, 'extension');
    assert.ok(html.includes('class="report__icon open" data-action="open-viewer"'),
                            'extension context contains open in viewer button');
  });

  it('generates HTML', () => {
    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(sampleResults);

    assert.ok(html.includes('<footer'), 'no footer tag found');
    assert.ok(html.includes('<div id="lhresults-dump">'), 'report results were inlined');
    assert.ok(html.includes('window.lhresults'), 'lhresults created');
    assert.ok(html.includes('.report-body'), 'report.css inlined');
    assert.ok(html.includes('.table_list td'), 'formatters css inlined');
    assert.ok(html.includes('&quot;lighthouseVersion'), 'lhresults were escaped');
    assert.ok(/Version: x\.x\.x/g.test(html), 'Version doesn\'t appear in report');
    assert.ok(html.includes('export-button'), 'page includes export button');
    assert.ok(html.includes('share js-share'), 'has share button');
    assert.ok(html.includes('data-action="save-html" '), 'has save html button');
    assert.ok(html.includes('data-action="save-json" '), 'has save json button');
    assert.ok(html.includes('class="report__icon copy"'), 'has copy button');
    assert.ok(html.includes('class="report__icon print"'), 'has print button');
    assert.ok(html.includes(
        '<code>&lt;meta name=&quot;viewport&quot;&gt;</code>'), 'escapes <code>, once.');
  });

  it('includes formatter output in HTML report', () => {
    const reportGenerator = new ReportGenerator();
    const html = reportGenerator.generateHTML(sampleResults);
    assert.ok(html.includes('scorecard'), 'contains output from cards formatter');
    assert.ok(html.includes('table_list'), 'contains output from table formatter');
    assert.ok(html.includes('class="cnc-node"'),
              'contains output from critical request chains formatter');
    assert.ok(html.includes('class="subitem__detail http-resource"'),
              'contains output from url list formatter');
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
      helpText: '`Code like this` and [links](http://example.com) ' +
          'should be transformed. but images (<img src="test.gif" onerror="alert(10)">) ' +
          'and <b>html should not</b>. ' +
          '[![Image preview](http://imagelink.com "Image preview")](http://imagelink.com)'
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
        '<a href="http://example.com" target="_blank" rel="noopener"'),
        'anchors are transformed');
    assert.ok(html.includes( '<a href="http://imagelink.com"'), 'images in links are transformed');
    assert.ok(html.includes( '<img src="http://imagelink.com"'), 'images are transformed');
    assert.ok(!html.includes(
        '<img src="test.gif" onerror="alert(10)">'), 'non-recognized HTML is sanitized');
  });

  describe('Partials', () => {
    it('registers known partials', () => {
      const reportGenerator = new ReportGenerator();

      const audits = {
        fakeAudit: {
          name: 'fake-audit',
          extendedInfo: {
            formatter: Formatter.SUPPORTED_FORMATS.CRITICAL_REQUEST_CHAINS
          }
        }
      };

      reportGenerator._registerPartials(audits);
      assert.ok(Handlebars.partials['fake-audit']);
      Handlebars.unregisterPartial('fake-audit');
    });

    it('throws on requesting an unknown partial', () => {
      const reportGenerator = new ReportGenerator();

      const audits = {
        fakeAudit: {
          name: 'bad-audit',
          extendedInfo: {
            formatter: Formatter.SUPPORTED_FORMATS.NOT_A_REAL_THING
          }
        }
      };

      assert.throws(_ => reportGenerator._registerPartials(audits));
    });
  });
});
