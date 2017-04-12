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

/* eslint-env browser */

const RATINGS = {
  PASS: {label: 'pass', minScore: 75},
  AVERAGE: {label: 'average', minScore: 45},
  FAIL: {label: 'fail'}
};

/**
 * Convert a score to a rating label.
 * @param {number} score
 * @return {string}
 */
function calculateRating(score) {
  let rating = RATINGS.FAIL.label;
  if (score >= RATINGS.PASS.minScore) {
    rating = RATINGS.PASS.label;
  } else if (score >= RATINGS.AVERAGE.minScore) {
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

class ReportRenderer {
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
    Object.keys(attrs).forEach(key => {
      element.setAttribute(key, attrs[key]);
    });
    return element;
  }

  /**
   * @param {string} selector
   * @return {!DocumentFragment} A clone of the template content.
   * @throws {Error}
   */
  _cloneTemplate(selector) {
    const template = this._document.querySelector(selector);
    if (!template) {
      throw new Error(`Template not found: template${selector}`);
    }
    return this._document.importNode(template.content, true);
  }

  /**
   * @param {!DocumentFragment|!Element} element DOM node to populate with values.
   * @param {number} score
   * @param {string} scoringMode
   * @param {string} title
   * @param {string} description
   * @return {!Element}
   */
  _populateScore(element, score, scoringMode, title, description) {
    // Fill in the blanks.
    const valueEl = element.querySelector('.lighthouse-score__value');
    valueEl.textContent = formatNumber(score);
    valueEl.classList.add(`lighthouse-score__value--${calculateRating(score)}`,
                          `lighthouse-score__value--${scoringMode}`);

    element.querySelector('.lighthouse-score__title').textContent = title;
    element.querySelector('.lighthouse-score__description')
        .appendChild(this._convertMarkdownLinksToElement(description));

    return element;
  }

  /**
   * @param {!AuditJSON} audit
   * @return {!Element}
   */
  _renderAuditScore(audit) {
    const tmpl = this._cloneTemplate('#tmpl-lighthouse-audit-score');

    const scoringMode = audit.result.scoringMode;
    const description = audit.result.helpText;
    let title = audit.result.description;

    if (audit.result.displayValue) {
      title += `:  ${audit.result.displayValue}`;
    }
    if (audit.result.optimalValue) {
      title += ` (target: ${audit.result.optimalValue})`;
    }

    // Append audit details to header section so the entire audit is within a <details>.
    const header = tmpl.querySelector('.lighthouse-score__header');
    header.open = audit.score < 100; // expand failed audits
    if (audit.result.details) {
      header.appendChild(this._renderDetails(audit.result.details));
    }

    return this._populateScore(tmpl, audit.score, scoringMode, title, description);
  }

  /**
   * @param {!CategoryJSON} category
   * @return {!Element}
   */
  _renderCategoryScore(category) {
    const tmpl = this._cloneTemplate('#tmpl-lighthouse-category-score');
    const score = Math.round(category.score);
    return this._populateScore(tmpl, score, 'numeric', category.name, category.description);
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
   * @param {string} text
   * @return {!HTMLSpanElement}
   */
  _convertMarkdownLinksToElement(text) {
    const element = this._createElement('span');

    // Split on markdown links (e.g. [some link](https://...)).
    const parts = text.split(/\[(.*?)\]\((https?:\/\/.*?)\)/g);

    while (parts.length) {
      // Pop off the same number of elements as there are capture groups.
      const [preambleText, linkText, linkHref] = parts.splice(0, 3);
      element.appendChild(this._document.createTextNode(preambleText));

      // Append link if there are any.
      if (linkText && linkHref) {
        const a = this._createElement('a');
        a.rel = 'noopener';
        a.target = '_blank';
        a.textContent = linkText;
        a.href = (new URL(linkHref)).href;
        element.appendChild(a);
      }
    }

    return element;
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
    element.appendChild(this._renderCategoryScore(category));
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
    element.appendChild(this._renderAuditScore(audit));
    return element;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportRenderer;
}

/** @typedef {{type: string, text: string|undefined, header: DetailsJSON|undefined, items: Array<DetailsJSON>|undefined}} */
let DetailsJSON; // eslint-disable-line no-unused-vars

/** @typedef {{id: string, weight: number, score: number, result: {description: string, displayValue: string, helpText: string, score: number|boolean, details: DetailsJSON|undefined}}} */
let AuditJSON; // eslint-disable-line no-unused-vars

/** @typedef {{name: string, weight: number, score: number, description: string, audits: Array<AuditJSON>}} */
let CategoryJSON; // eslint-disable-line no-unused-vars

/** @typedef {{reportCategories: Array<CategoryJSON>}} */
let ReportJSON; // eslint-disable-line no-unused-vars
