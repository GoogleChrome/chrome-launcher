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
const URL = require('../../../../lib/url-shim');
const DOM = require('../../../../report/v2/renderer/dom.js');
const DetailsRenderer = require('../../../../report/v2/renderer/details-renderer.js');
const CategoryRenderer = require('../../../../report/v2/renderer/category-renderer.js');
const ReportRenderer = require('../../../../report/v2/renderer/report-renderer.js');
const sampleResults = require('../../../results/sample_v2.json');

const TEMPLATE_FILE = fs.readFileSync(__dirname + '/../../../../report/v2/templates.html', 'utf8');

describe('ReportRenderer V2', () => {
  let renderer;

  before(() => {
    global.URL = URL;
    const document = jsdom.jsdom(TEMPLATE_FILE);
    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    const categoryRenderer = new CategoryRenderer(dom, detailsRenderer);
    renderer = new ReportRenderer(dom, categoryRenderer);
  });

  after(() => {
    global.URL = undefined;
  });

  describe('renderReport', () => {
    it('should render a report', () => {
      const output = renderer.renderReport(sampleResults);
      assert.ok(output.classList.contains('lh-report'));
      assert.equal(output.querySelectorAll('.lh-gauge').length,
          sampleResults.reportCategories.length, 'renders category gauges');
    });

    it('should render an exception for invalid input', () => {
      const output = renderer.renderReport({
        get reportCategories() {
          throw new Error();
        }
      });
      assert.ok(output.classList.contains('lh-exception'));
    });
  });
});
