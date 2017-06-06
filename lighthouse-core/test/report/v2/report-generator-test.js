/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const ReportGeneratorV2 = require('../../../report/v2/report-generator.js');
const TEMPLATES_FILE = fs.readFileSync(__dirname + '/../../../report/v2/templates.html', 'utf8');

/* eslint-env mocha */

describe('ReportGeneratorV2', () => {
  describe('#replaceStrings', () => {
    it('should replace all occurrences', () => {
      const source = '%foo! %foo %bar!';
      const result = ReportGeneratorV2.replaceStrings(source, [
        {search: '%foo', replacement: 'hey'},
        {search: '%bar', replacement: 'you'},
      ]);

      assert.equal(result, 'hey! hey you!');
    });

    it('should not replace serial occurences', () => {
      const result = ReportGeneratorV2.replaceStrings('%1', [
        {search: '%1', replacement: '%2'},
        {search: '%2', replacement: 'pwnd'},
      ]);

      assert.equal(result, '%2');
    });
  });

  describe('#arithmeticMean', () => {
    it('should work for empty list', () => {
      assert.equal(ReportGeneratorV2.arithmeticMean([]), 0);
    });

    it('should work for equal weights', () => {
      assert.equal(ReportGeneratorV2.arithmeticMean([
        {score: 10, weight: 1},
        {score: 20, weight: 1},
        {score: 3, weight: 1}
      ]), 11);
    });

    it('should work for varying weights', () => {
      assert.equal(ReportGeneratorV2.arithmeticMean([
        {score: 10, weight: 2},
        {score: 0, weight: 7},
        {score: 20, weight: 1}
      ]), 4);
    });

    it('should work for missing values', () => {
      assert.equal(ReportGeneratorV2.arithmeticMean([
        {weight: 1},
        {score: 30, weight: 1},
        {weight: 1},
        {score: 100},
      ]), 10);
    });
  });

  describe('#generateReportJson', () => {
    it('should return a score', () => {
      const result = new ReportGeneratorV2().generateReportJson({
        categories: {
          'categoryA': {weight: 1, audits: [{id: 'auditA', weight: 1}]},
          'categoryB': {weight: 4, audits: [{id: 'auditB', weight: 1}]},
          'categoryC': {audits: []},
        }
      }, {auditA: {score: 50}, auditB: {score: 100}});

      assert.equal(result.score, 90);
    });

    it('should return categories', () => {
      const result = new ReportGeneratorV2().generateReportJson({
        categories: {
          'my-category': {name: 'My Category', audits: []},
          'my-other-category': {description: 'It is a nice category', audits: []},
        }
      }, {});

      assert.equal(result.categories.length, 2);
      assert.equal(result.categories[0].name, 'My Category');
      assert.equal(result.categories[1].description, 'It is a nice category');
    });

    it('should score the categories', () => {
      const auditResults = {
        'my-audit': {rawValue: 'you passed'},
        'my-boolean-audit': {score: true, extendedInfo: {}},
        'my-scored-audit': {score: 100},
        'my-failed-audit': {score: 20},
        'my-boolean-failed-audit': {score: false},
      };

      const result = new ReportGeneratorV2().generateReportJson({
        categories: {
          'my-category': {audits: [{id: 'my-audit'}]},
          'my-scored': {
            audits: [
              {id: 'my-boolean-audit', weight: 1},
              {id: 'my-scored-audit', weight: 1},
              {id: 'my-failed-audit', weight: 1},
              {id: 'my-boolean-failed-audit', weight: 1},
            ]
          },
        }
      }, auditResults);

      assert.equal(result.categories.length, 2);
      assert.equal(result.categories[0].score, 0);
      assert.equal(result.categories[1].score, 55);
    });
  });

  describe('#generateHtmlReport', () => {
    it('should return html', () => {
      const result = new ReportGeneratorV2().generateReportHtml({});
      assert.ok(result.includes('doctype html'), 'includes doctype');
      assert.ok(result.trim().match(/<\/html>$/), 'ends with HTML tag');
    });

    it('should inject the report JSON', () => {
      const code = 'hax</script><script>console.log("pwned");%%LIGHTHOUSE_JAVASCRIPT%%';
      const result = new ReportGeneratorV2().generateReportHtml({code});
      assert.ok(result.includes('"code":"hax'), 'injects the json');
      assert.ok(result.includes('\\u003c/script'), 'escapes HTML tags');
      assert.ok(result.includes('LIGHTHOUSE_JAVASCRIPT'), 'cannot be tricked');
    });

    it('should inject the report templates', () => {
      const page = jsdom.jsdom(new ReportGeneratorV2().generateReportHtml({}));
      const templates = jsdom.jsdom(TEMPLATES_FILE);
      assert.equal(page.querySelectorAll('template[id^="tmpl-"]').length,
          templates.querySelectorAll('template[id^="tmpl-"]').length, 'all templates injected');
    });

    it('should inject the report CSS', () => {
      const result = new ReportGeneratorV2().generateReportHtml({});
      assert.ok(!result.includes('/*%%LIGHTHOUSE_CSS%%*/'));
      assert.ok(result.includes('--pass-color'));
    });

    it('should inject the report renderer javascript', () => {
      const result = new ReportGeneratorV2().generateReportHtml({});
      assert.ok(result.includes('ReportRenderer'), 'injects the script');
      assert.ok(result.includes('pre$`post'), 'does not break from String.replace');
      assert.ok(result.includes('LIGHTHOUSE_JSON'), 'cannot be tricked');
    });
  });
});
