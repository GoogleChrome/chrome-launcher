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

/**
 * @fileoverview The entry point for rendering the Lighthouse report based on the JSON output.
 *    This file is injected into the report HTML along with the JSON report.
 *
 * Dummy text for ensuring report robustness: </script> pre$`post %%LIGHTHOUSE_JSON%%
 */

/* globals self */

class ReportRenderer {
  /**
   * @param {!DOM} dom
   * @param {!CategoryRenderer} categoryRenderer
   */
  constructor(dom, categoryRenderer) {
    /** @private {!DOM} */
    this._dom = dom;
    /** @private {!CategoryRenderer} */
    this._categoryRenderer = categoryRenderer;
  }

  /**
   * @param {!ReportRenderer.ReportJSON} report
   * @return {!Element}
   */
  renderReport(report) {
    try {
      return this._renderReport(report);
    } catch (/** @type {!Error} */ e) {
      return this._renderException(e);
    }
  }

  /**
   * Define a custom element for <templates> to be extracted from. For example:
   *     this.setTemplateContext(new DOMParser().parseFromString(htmlStr, 'text/html'))
   * @param {!Document|!Element} context
   */
  setTemplateContext(context) {
    this._categoryRenderer.setTemplateContext(context);
  }

  /**
   * @param {!Error} e
   * @return {!Element}
   */
  _renderException(e) {
    const element = this._dom.createElement('div', 'lh-exception');
    element.textContent = String(e.stack);
    return element;
  }

  /**
   * @param {!ReportRenderer.ReportJSON} report
   * @return {!Element}
   */
  _renderReport(report) {
    const element = this._dom.createElement('div', 'lh-report');
    for (const category of report.reportCategories) {
      element.appendChild(this._categoryRenderer.render(category));
    }
    return element;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportRenderer;
} else {
  self.ReportRenderer = ReportRenderer;
}

/**
 * @typedef {{
 *     id: string,
 *     weight: number,
 *     score: number,
 *     result: {
 *       description: string,
 *       displayValue: string,
 *       helpText: string,
 *       score: (number|boolean),
 *       scoringMode: string,
 *       optimalValue: number,
 *       details: (!DetailsRenderer.DetailsJSON|undefined)
 *     }
 * }}
 */
ReportRenderer.AuditJSON; // eslint-disable-line no-unused-expressions

/**
 * @typedef {{
 *     name: string,
 *     weight: number,
 *     score: number,
 *     description: string,
 *     audits: !Array<!ReportRenderer.AuditJSON>
 * }}
 */
ReportRenderer.CategoryJSON; // eslint-disable-line no-unused-expressions

/**
 * @typedef {{
 *     lighthouseVersion: string,
 *     generatedTime: string,
 *     initialUrl: string,
 *     url: string,
 *     reportCategories: !Array<!ReportRenderer.CategoryJSON>
 * }}
 */
ReportRenderer.ReportJSON; // eslint-disable-line no-unused-expressions
