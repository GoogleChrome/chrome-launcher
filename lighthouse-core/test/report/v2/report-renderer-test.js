/**
 * Copyright 2017 Google Inc. All rights reserved.
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

/* eslint-env mocha, browser */

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const ReportRenderer = require('../../../report/v2/report-renderer.js');
const sampleResults = require('../../results/sample_v2.json');

const TEMPLATE_FILE = fs.readFileSync(__dirname + '/../../../report/v2/templates.html', 'utf8');

describe('ReportRenderer V2', () => {
  describe('renderReport', () => {
    const document = jsdom.jsdom(TEMPLATE_FILE);
    const renderer = new ReportRenderer(document);

    it('should render a report', () => {
      const output = renderer.renderReport(sampleResults);
      assert.ok(output.classList.contains('lighthouse-report'));
    });

    it('should render an exception for invalid input', () => {
      const output = renderer.renderReport({
        get reportCategories() {
          throw new Error();
        }
      });
      assert.ok(output.classList.contains('lighthouse-exception'));
    });

    describe('createElement', () => {
      it('creates a simple element using default values', () => {
        const el = renderer._createElement('div');
        assert.equal(el.localName, 'div');
        assert.equal(el.className, '');
        assert.equal(el.className, el.attributes.length);
      });

      it('creates an element from parameters', () => {
        const el = renderer._createElement(
            'div', 'class1 class2', {title: 'title attr', tabindex: 0});
        assert.equal(el.localName, 'div');
        assert.equal(el.className, 'class1 class2');
        assert.equal(el.getAttribute('title'), 'title attr');
        assert.equal(el.getAttribute('tabindex'), '0');
      });
    });

    describe('cloneTemplate', () => {
      it('should clone a template', () => {
        const clone = renderer._cloneTemplate('#tmpl-lighthouse-audit-score');
        assert.ok(clone.querySelector('.lighthouse-score'));
      });

      it('fails when template cannot be found', () => {
        assert.throws(() => renderer._cloneTemplate('#unknown-selector'));
      });
    });

    it('renders an audit', () => {
      const audit = sampleResults.reportCategories[0].audits[0];
      const auditDOM = renderer._renderAudit(audit);

      const title = auditDOM.querySelector('.lighthouse-score__title');
      const description = auditDOM.querySelector('.lighthouse-score__description');
      const score = auditDOM.querySelector('.lighthouse-score__value');

      assert.equal(title.textContent, audit.result.description);
      assert.equal(description.textContent, audit.result.helpText);
      assert.equal(score.textContent, '0');
      assert.ok(score.classList.contains('lighthouse-score__value--fail'));
      assert.ok(score.classList.contains(`lighthouse-score__value--${audit.result.scoringMode}`));
    });

    it('renders a category', () => {
      const category = sampleResults.reportCategories[0];
      const categoryDOM = renderer._renderCategory(category);

      const score = categoryDOM.querySelector('.lighthouse-score');
      const value = categoryDOM.querySelector('.lighthouse-score  > .lighthouse-score__value');
      const title = score.querySelector('.lighthouse-score__title');
      const description = score.querySelector('.lighthouse-score__description');

      assert.deepEqual(score, score.firstElementChild, 'first child is a score');
      assert.ok(value.classList.contains('lighthouse-score__value--numeric'),
                'category score is numeric');
      assert.equal(value.textContent, Math.round(category.score), 'category score is rounded');
      assert.equal(title.textContent, category.name, 'title is set');
      assert.equal(description.textContent, category.description, 'description is set');

      const audits = categoryDOM.querySelectorAll('.lighthouse-category > .lighthouse-audit');
      assert.equal(audits.length, category.audits.length, 'renders correct number of audits');
    });
  });
});
