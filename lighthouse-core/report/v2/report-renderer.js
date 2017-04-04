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

/* eslint-env browser */
/* eslint indent: [2, 2, { "SwitchCase": 1, "outerIIFEBody": 0 }] */

(function() {
const RATINGS = {
  GOOD: {label: 'good', minScore: 75},
  AVERAGE: {label: 'average', minScore: 45},
  POOR: {label: 'poor'}
};

/**
 * Convert a score to a rating label.
 * @param {number} value
 * @return {string}
 */
function calculateRating(value) {
  let rating = RATINGS.POOR.label;
  if (value >= RATINGS.GOOD.minScore) {
    rating = RATINGS.GOOD.label;
  } else if (value >= RATINGS.AVERAGE.minScore) {
    rating = RATINGS.AVERAGE.label;
  }
  return rating;
}

/**
 * Format number.
 * @param {number} number
 * @return {string}
 */
function formatNumber(number) {
  return number.toLocaleString(undefined, {maximumFractionDigits: 1});
}

/**
 * @fileoverview The entry point for rendering the Lighthouse report based on the JSON output.
 *    This file is injected into the report HTML along with the JSON report.
 *
 * Dummy text for ensuring report robustness: </script> pre$`post %%LIGHTHOUSE_JSON%%
 */
window.ReportRenderer = class ReportRenderer {
  /**
   * @param {!Document} document
   */
  constructor(document) {
    this._document = document;
  }

  /**
   * @param {!ReportJSON} report
   * @return {!Element}
   */
  renderReport(report) {
    try {
      return this._renderReport(report);
    } catch (e) {
      return this._renderException(e);
    }
  }

  /**
   * @param {string} name
   * @param {string=} className
   * @param {!Object<string, string>=} attrs Attribute key/val pairs.
   * @return {!Element}
   */
  _createElement(name, className, attrs = {}) {
    const element = this._document.createElement(name);
    if (className) {
      element.className = className;
    }
    for (const [key, val] of Object.entries(attrs)) {
      element.setAttribute(key, val);
    }
    return element;
  }

  /**
   * @param {number} score
   * @param {string} title
   * @param {string} description
   * @return {!Element}
   */
  _renderScore(score, title, description) {
    const element = this._createElement('div', 'lighthouse-score');

    const value = element.appendChild(this._createElement('div', 'lighthouse-score__value'));
    value.textContent = formatNumber(score);
    value.classList.add(`lighthouse-score__value--${calculateRating(score)}`);

    const column = element.appendChild(this._createElement('div', 'lighthouse-score__text'));
    column.appendChild(this._createElement('div', 'lighthouse-score__title')).textContent = title;
    column.appendChild(
      this._createElement('div', 'lighthouse-score__description')).textContent = description;

    return element;
  }

  /**
   * @param {!DetailsJSON} details
   * @return {!Element}
   */
  _renderDetails(details) {
    switch (details.type) {
      case 'text':
        return this._renderText(details);
      case 'block':
        return this._renderBlock(details);
      case 'list':
        return this._renderList(details);
      default:
        throw new Error(`Unknown type: ${details.type}`);
    }
  }

  /**
   * @param {!DetailsJSON} text
   * @return {!Element}
   */
  _renderText(text) {
    const element = this._createElement('div', 'lighthouse-text');
    element.textContent = text.text;
    return element;
  }

  /**
   * @param {!DetailsJSON} block
   * @return {!Element}
   */
  _renderBlock(block) {
    const element = this._createElement('div', 'lighthouse-block');
    for (const item of block.items) {
      element.appendChild(this._renderDetails(item));
    }
    return element;
  }

  /**
   * @param {!DetailsJSON} list
   * @return {!Element}
   */
  _renderList(list) {
    const element = this._createElement('details', 'lighthouse-list');
    if (list.header) {
      const summary = this._createElement('summary', 'lighthouse-list__header');
      summary.textContent = list.header.text;
      element.appendChild(summary);
    }

    const items = this._createElement('div', 'lighthouse-list__items');
    for (const item of list.items) {
      items.appendChild(this._renderDetails(item));
    }
    element.appendChild(items);
    return element;
  }

  /**
   * @param {!Error} e
   * @return {!Element}
   */
  _renderException(e) {
    const element = this._createElement('div', 'lighthouse-exception');
    element.textContent = String(e.stack);
    return element;
  }

  /**
   * @param {!ReportJSON} report
   * @return {!Element}
   */
  _renderReport(report) {
    const element = this._createElement('div', 'lighthouse-report');
    for (const category of report.reportCategories) {
      element.appendChild(this._renderCategory(category));
    }
    return element;
  }

  /**
   * @param {!CategoryJSON} category
   * @return {!Element}
   */
  _renderCategory(category) {
    const element = this._createElement('div', 'lighthouse-category');
    element.appendChild(this._renderScore(category.score, category.name, category.description));
    for (const audit of category.audits) {
      element.appendChild(this._renderAudit(audit));
    }
    return element;
  }

  /**
   * @param {!AuditJSON} audit
   * @return {!Element}
   */
  _renderAudit(audit) {
    const element = this._createElement('div', 'lighthouse-audit');
    let title = audit.result.description;
    if (audit.result.displayValue) {
      title += ': ' + audit.result.displayValue;
    }
    element.appendChild(this._renderScore(audit.score, title, audit.result.helpText));
    if (audit.result.details) {
      element.appendChild(this._renderDetails(audit.result.details));
    }
    return element;
  }
};
})();

/** @typedef {{type: string, text: string|undefined, header: DetailsJSON|undefined, items: Array<DetailsJSON>|undefined}} */
let DetailsJSON; // eslint-disable-line no-unused-vars

/** @typedef {{id: string, weight: number, score: number, result: {description: string, displayValue: string, helpText: string, score: number|boolean, details: DetailsJSON|undefined}}} */
let AuditJSON; // eslint-disable-line no-unused-vars

/** @typedef {{name: string, weight: number, score: number, description: string, audits: Array<AuditJSON>}} */
let CategoryJSON; // eslint-disable-line no-unused-vars

/** @typedef {{reportCategories: Array<CategoryJSON>}} */
let ReportJSON; // eslint-disable-line no-unused-vars
