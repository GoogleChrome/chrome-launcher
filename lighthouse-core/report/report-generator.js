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

const RATINGS = {
  GOOD: {label: 'good', minValue: 0.66, minScore: 75},
  AVERAGE: {label: 'average', minValue: 0.33},
  POOR: {label: 'poor', minScore: 45}
};

class ReportGenerator {

  constructor() {
    const getTotalScore = aggregation => {
      const totalScore = aggregation.score.reduce((total, s) => {
        return total + s.overall;
      }, 0) / aggregation.score.length;

      return Math.round(totalScore * 100);
    };

    const getItemRating = value => {
      if (typeof value === 'boolean') {
        return value ? RATINGS.GOOD.label : RATINGS.POOR.label;
      }

      // Limit the rating to average if this is a rating for Best Practices.
      let rating = RATINGS.POOR.label;
      if (value > RATINGS.GOOD.minValue) {
        rating = RATINGS.GOOD.label;
      } else if (value > RATINGS.AVERAGE.minValue) {
        rating = RATINGS.AVERAGE.label;
      }

      return rating;
    };

    // Converts a name to a link.
    Handlebars.registerHelper('nameToLink', name => {
      return name.toLowerCase().replace(/\s/, '-');
    });

    // Helper for either show an "✘" or "✔" booleans, or simply returning the
    // value if it's of any other type.
    Handlebars.registerHelper('getItemValue', value => {
      if (typeof value === 'boolean') {
        return value ? '&#10004;' : '&#10008;';
      }

      return value;
    });

    // Figures out the total score for an aggregation
    Handlebars.registerHelper('getTotalScore', getTotalScore);

    // Converts the total score to a rating that can be used for styling.
    Handlebars.registerHelper('getTotalScoreRating', aggregation => {
      const totalScore = getTotalScore(aggregation);

      let rating = RATINGS.POOR.label;
      if (totalScore > RATINGS.POOR.minScore) {
        rating = RATINGS.AVERAGE.label;
      }
      if (totalScore > RATINGS.GOOD.minScore) {
        rating = RATINGS.GOOD.label;
      }

      return rating;
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

    // a > b
    Handlebars.registerHelper('gt', (a, b) => (a > b));

    // !value
    Handlebars.registerHelper('not', value => !value);

    // arg1 && arg2 && ... && argn
    Handlebars.registerHelper('and', () => {
      let arg = false;
      for (let i = 0, n = arguments.length - 1; i < n; i++) {
        arg = arguments[i];
        if (!arg) {
          break;
        }
      }
      return arg;
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
    const formatter = new Intl.DateTimeFormat('en-US', options);
    return formatter.format(new Date(date));
  }

  /**
   * Gets the HTML for the report.
   * @return {string}
   */
  getReportHTML() {
    return fs.readFileSync(path.join(__dirname, './templates/report.html'), 'utf8');
  }

  /**
   * Gets the CSS for the report.
   * @return {string}
   */
  getReportCSS() {
    return fs.readFileSync(path.join(__dirname, './styles/report.css'), 'utf8');
  }

  /**
   * Gets the JavaScript for the report.
   * @param  {boolean} inline Whether or not to give the JS back as an inline script vs external.
   * @return {string}
   */
  getReportJS(inline) {
    // If this is for the extension we won't be able to run JS inline to the page so we will
    // return a path to a JS file that will be copied in from ./scripts/report.js by gulp.
    if (inline) {
      const reportScript =
          fs.readFileSync(path.join(__dirname, './scripts/lighthouse-report.js'), 'utf8');
      return `<script>${reportScript}</script>`;
    }
    return '<script src="/pages/scripts/lighthouse-report.js"></script>';
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

  generateHTML(results, options) {
    const inline = (options && options.inline) || false;

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

    const template = Handlebars.compile(this.getReportHTML());
    return template({
      url: results.url,
      lighthouseVersion: results.lighthouseVersion,
      generatedTime: this._formatTime(results.generatedTime),
      css: this.getReportCSS(inline),
      reportContext: 'extension', // devtools, extension, cli
      script: this.getReportJS(inline),
      aggregations: results.aggregations,
      auditsByCategory: this._createPWAAuditsByCategory(results.aggregations)
    });
  }
}

module.exports = ReportGenerator;
