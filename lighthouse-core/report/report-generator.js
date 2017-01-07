/**
 * @license
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

/* global Intl */

const Formatter = require('../formatters/formatter');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const marked = require('marked');

const RATINGS = {
  GOOD: {label: 'good', minScore: 75},
  AVERAGE: {label: 'average', minScore: 45},
  POOR: {label: 'poor'}
};

function calculateRating(value) {
  let rating = RATINGS.POOR.label;
  if (value >= RATINGS.GOOD.minScore) {
    rating = RATINGS.GOOD.label;
  } else if (value >= RATINGS.AVERAGE.minScore) {
    rating = RATINGS.AVERAGE.label;
  }
  return rating;
}

class ReportGenerator {

  constructor() {
    const getTotalScore = aggregation => {
      return Math.round(aggregation.total * 100);
    };

    const getItemRating = value => {
      if (typeof value === 'boolean') {
        return value ? RATINGS.GOOD.label : RATINGS.POOR.label;
      }
      return calculateRating(value);
    };

    // Converts a name to a link.
    Handlebars.registerHelper('nameToLink', name => {
      return name.toLowerCase().replace(/\s/, '-');
    });

    // Figures out the total score for an aggregation
    Handlebars.registerHelper('getTotalScore', getTotalScore);

    // Converts the total score to a rating that can be used for styling.
    Handlebars.registerHelper('getTotalScoreRating', aggregation => {
      const totalScore = getTotalScore(aggregation);
      return calculateRating(totalScore);
    });

    // Converts a value to a rating string, which can be used inside the report
    // for color styling.
    Handlebars.registerHelper('getItemRating', getItemRating);

    Handlebars.registerHelper('shouldShowHelpText',
      value => (getItemRating(value) !== RATINGS.GOOD.label));

    // Convert numbers to fixed point decimals
    Handlebars.registerHelper('decimal', number => {
      if (number && number.toFixed) {
        return number.toFixed(2);
      }
      return number;
    });

    // value is boolean?
    Handlebars.registerHelper('is-bool', value => (typeof value === 'boolean'));

    // !value
    Handlebars.registerHelper('not', value => !value);

    // value == value2?
    Handlebars.registerHelper('if_not_eq', function(lhs, rhs, options) {
      if (lhs !== rhs) {
        // eslint-disable-next-line no-invalid-this
        return options.fn(this);
      } else {
        // eslint-disable-next-line no-invalid-this
        return options.inverse(this);
      }
    });

    // arg1 && arg2 && ... && argn
    Handlebars.registerHelper('and', function() {
      let arg = false;
      for (let i = 0, n = arguments.length - 1; i < n; i++) {
        arg = arguments[i];
        if (!arg) {
          break;
        }
      }
      return arg;
    });

    // eslint-disable-next-line no-unused-vars
    Handlebars.registerHelper('sanitize', function(str, opts) {
      // const isViewer = opts.data.root.reportContext === 'viewer';

      // Allow the report to inject HTML, but sanitize it first.
      // Viewer in particular, allows user's to upload JSON. To mitigate against
      // XSS, define a renderer that only transforms links and code snippets.
      // All other markdown ad HTML is ignored.
      const renderer = new marked.Renderer();
      renderer.link = (href, title, text) => {
        title = title || text;
        return `<a href="${href}" target="_blank" rel="noopener" title="${title}">${text}</a>`;
      };
      renderer.codespan = function(str) {
        return `<code>${str}</code>`;
      };
      // Nuke wrapper <p> tag that gets generated.
      renderer.paragraph = function(str) {
        return str;
      };

      try {
        str = marked(str, {renderer, sanitize: true});
      } catch (e) {
        // Ignore fatal errors from marked js.
      }

      // The input str has been santized and transformed. Mark it as safe so
      // handlebars renders the text as HTML.
      return new Handlebars.SafeString(str);
    });
  }

  /**
   * Format time
   * @return {string}
   */
  _formatTime(date) {
    const options = {
      day: 'numeric', month: 'numeric', year: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      timeZoneName: 'short'
    };
    let formatter = new Intl.DateTimeFormat('en-US', options);

    // Force UTC if runtime timezone could not be detected.
    // See https://github.com/GoogleChrome/lighthouse/issues/1056
    const tz = formatter.resolvedOptions().timeZone;
    if (!tz || tz.toLowerCase() === 'etc/unknown') {
      options.timeZone = 'UTC';
      formatter = new Intl.DateTimeFormat('en-US', options);
    }
    return formatter.format(new Date(date));
  }

  /**
   * Escape closing script tags.
   * @return {string}
   */
  _escapeScriptTags(jsonStr) {
    return jsonStr.replace(/<\/script>/g, '<\\/script>');
  }

  /**
   * Gets the template for the report.
   * @return {string}
   */
  getReportTemplate() {
    return fs.readFileSync(path.join(__dirname, './templates/report-template.html'), 'utf8');
  }

  /**
   * Gets the template for any exceptions.
   * @return {string}
   */
  getExceptionTemplate() {
    return fs.readFileSync(path.join(__dirname, './templates/exception.html'), 'utf8');
  }

  /**
   * Gets the CSS for the report.
   * @return {string}
   */
  getReportCSS() {
    return fs.readFileSync(path.join(__dirname, './styles/report.css'), 'utf8');
  }

  /**
   * Gets the script for the report UI
   * @return {string}
   */
  getReportJS() {
    return fs.readFileSync(path.join(__dirname, './scripts/lighthouse-report.js'), 'utf8');
  }

  /**
   * Refactors the PWA audits into their respective tech categories, i.e. offline, manifest, etc
   * because the report itself supports viewing them by user feature (default), or by category.
   */
  _createPWAAuditsByCategory(aggregations) {
    const items = {};

    aggregations.forEach(aggregation => {
      // We only regroup the PWA aggregations so ignore any
      // that don't match that name, i.e. Best Practices, metrics.
      if (!aggregation.categorizable) {
        return;
      }

      aggregation.score.forEach(score => {
        score.subItems.forEach(subItem => {
          // Create a space for the category.
          if (!items[subItem.category]) {
            items[subItem.category] = {};
          }

          // Then use the name to de-dupe the same audit from different aggregations.
          if (!items[subItem.category][subItem.name]) {
            items[subItem.category][subItem.name] = subItem;
          }
        });
      });
    });

    return items;
  }

  /**
   * Creates the page describing any error generated while running generateHTML()
   * @param {!Error} err Exception thrown from generateHTML.
   * @param {!Object} results Lighthouse results.
   * @returns {string} HTML of the exception page.
   */
  renderException(err, results) {
    const template = Handlebars.compile(this.getExceptionTemplate());
    return template({
      errMessage: err.message,
      errStack: err.stack,
      css: this.getReportCSS(),
      results: JSON.stringify(results, null, 2)
    });
  }

  /**
   * Generates the Lighthouse report HTML.
   * @param {!Object} results Lighthouse results.
   * @param {!string} reportContext What app is requesting the report (eg. devtools, extension)
   * @returns {string} HTML of the report page.
   */
  generateHTML(results, reportContext) {
    reportContext = reportContext || 'extension';

    // Ensure the formatter for each extendedInfo is registered.
    Object.keys(results.audits).forEach(audit => {
      // Use value rather than key for audit.
      audit = results.audits[audit];

      if (!audit.extendedInfo) {
        return;
      }
      if (!audit.extendedInfo.formatter) {
        // HTML formatter not provided for this subItem
        return;
      }
      const formatter = Formatter.getByName(audit.extendedInfo.formatter);
      const helpers = formatter.getHelpers();
      if (helpers) {
        Handlebars.registerHelper(helpers);
      }

      Handlebars.registerPartial(audit.name, formatter.getFormatter('html'));
    });

    results.aggregations.forEach(aggregation => {
      aggregation.score.forEach(score => {
        // Map subItem strings to auditResults from results.audits.
        // Coming soon events are not in auditResults, but rather still in subItems.
        score.subItems = score.subItems.map(subItem => results.audits[subItem] || subItem);
      });
    });

    const template = Handlebars.compile(this.getReportTemplate());

    return template({
      url: results.url,
      lighthouseVersion: results.lighthouseVersion,
      generatedTime: this._formatTime(results.generatedTime),
      lhresults: this._escapeScriptTags(JSON.stringify(results, null, 2)),
      css: this.getReportCSS(),
      reportContext: reportContext,
      script: reportContext === 'devtools' ? '' : this.getReportJS(),
      aggregations: results.aggregations,
      auditsByCategory: this._createPWAAuditsByCategory(results.aggregations)
    });
  }
}

module.exports = ReportGenerator;
