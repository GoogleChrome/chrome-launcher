/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const Util = require('../../../../report/v2/renderer/util.js');
const URL = require('../../../../lib/url-shim');
const DOM = require('../../../../report/v2/renderer/dom.js');
const DetailsRenderer = require('../../../../report/v2/renderer/details-renderer.js');
const ReportUIFeatures = require('../../../../report/v2/renderer/report-ui-features.js');
const CategoryRenderer = require('../../../../report/v2/renderer/category-renderer.js');
const CriticalRequestChainRenderer = require(
    '../../../../report/v2/renderer/crc-details-renderer.js');
const ReportRenderer = require('../../../../report/v2/renderer/report-renderer.js');
const sampleResults = require('../../../results/sample_v2.json');

const TIMESTAMP_REGEX = /\d+, \d{4}.*\d+:\d+/;
const TEMPLATE_FILE = fs.readFileSync(__dirname + '/../../../../report/v2/templates.html', 'utf8');

describe('ReportRenderer V2', () => {
  let renderer;

  before(() => {
    global.URL = URL;
    global.Util = Util;
    global.ReportUIFeatures = ReportUIFeatures;
    global.CriticalRequestChainRenderer = CriticalRequestChainRenderer;

    // Stub out matchMedia for Node.
    global.matchMedia = function() {
      return {
        addListener: function() {}
      };
    };

    const document = jsdom.jsdom(TEMPLATE_FILE);
    global.self = document.defaultView;

    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    const categoryRenderer = new CategoryRenderer(dom, detailsRenderer);
    renderer = new ReportRenderer(dom, categoryRenderer);
  });

  after(() => {
    global.self = undefined;
    global.URL = undefined;
    global.Util = undefined;
    global.ReportUIFeatures = undefined;
    global.matchMedia = undefined;
    global.CriticalRequestChainRenderer = undefined;
  });

  describe('renderReport', () => {
    it('should render a report', () => {
      const container = renderer._dom._document.body;
      const output = renderer.renderReport(sampleResults, container);
      assert.ok(container.contains(output), 'report appended to container');
      assert.ok(output.classList.contains('lh-container'));
      assert.ok(output.querySelector('.lh-header'), 'has a header');
      assert.ok(output.querySelector('.lh-report'), 'has report body');
      assert.equal(output.querySelectorAll('.lh-gauge').length,
          sampleResults.reportCategories.length * 2, 'renders category gauges');
    });

    it('renders additional reports by replacing the existing one', () => {
      const container = renderer._dom._document.body;
      const oldReport = renderer.renderReport(sampleResults, container);
      const newReport = renderer.renderReport(sampleResults, container);
      assert.ok(!container.contains(oldReport), 'old report was removed');
      assert.ok(container.contains(newReport), 'new report appended to container');
    });

    it('renders a header', () => {
      const header = renderer._renderReportHeader(sampleResults);
      assert.ok(header.querySelector('.lh-export'), 'contains export button');

      assert.ok(header.querySelector('.lh-config__timestamp').textContent.match(TIMESTAMP_REGEX),
          'formats the generated datetime');
      assert.equal(header.querySelector('.lh-metadata__url').textContent, sampleResults.url);
      const url = header.querySelector('.lh-metadata__url');
      assert.equal(url.textContent, sampleResults.url);
      assert.equal(url.href, sampleResults.url);

      const userAgent = header.querySelector('.lh-env__item__ua');
      assert.equal(userAgent.textContent, sampleResults.userAgent, 'user agent populated');

      // Check runtime settings were populated.
      const enables = header.querySelectorAll('.lh-env__enabled');
      const names = Array.from(header.querySelectorAll('.lh-env__name')).slice(1);
      const descriptions = header.querySelectorAll('.lh-env__description');
      sampleResults.runtimeConfig.environment.forEach((env, i) => {
        assert.equal(enables[i].textContent, env.enabled ? 'Enabled' : 'Disabled');
        assert.equal(names[i].textContent, env.name);
        assert.equal(descriptions[i].textContent, env.description);
      });
    });

    it('renders a left nav', () => {
      const header = renderer._renderReportNav(sampleResults);
      assert.equal(header.querySelectorAll('.lh-leftnav__item').length, 4);

      const categories = header.querySelectorAll('.leftnav-item__category');
      const scores = header.querySelectorAll('.leftnav-item__score');
      sampleResults.reportCategories.forEach((cat, i) => {
        assert.equal(categories[i].textContent, cat.name);
        assert.equal(scores[i].textContent, Math.round(Util.formatNumber(cat.score)));
      });
    });

    it('renders a footer', () => {
      const footer = renderer._renderReportFooter(sampleResults);
      const footerContent = footer.querySelector('.lh-footer').textContent;
      assert.ok(footerContent.includes('Generated by Lighthouse 2'), 'includes lh version');
      assert.ok(footerContent.match(TIMESTAMP_REGEX), 'includes timestamp');
    });
  });

  it('can set a custom templateContext', () => {
    assert.equal(renderer._templateContext, renderer._dom.document());

    const otherDocument = jsdom.jsdom(TEMPLATE_FILE);
    renderer.setTemplateContext(otherDocument);
    assert.equal(renderer._templateContext, otherDocument);
  });
});
