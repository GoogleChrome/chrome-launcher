/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global Intl */

const Handlebars = require('handlebars/runtime');
const handlebarHelpers = require('./handlebar-helpers');
const reportTemplate = require('./templates/report-templates');
const reportPartials = require('../report/partials/templates/report-partials');
const fs = require('fs');
const path = require('path');

class ReportGenerator {

  constructor() {
    Handlebars.registerHelper(handlebarHelpers);
  }

  /**
   * Escape closing script tags.
   * @param {string} jsonStr
   * @return {string}
   */
  _escapeScriptTags(jsonStr) {
    return jsonStr.replace(/<\/script>/g, '<\\/script>');
  }

  /**
   * Gets the CSS for the report.
   * @return {!Array<string>} an array of CSS
   */
  getReportCSS() {
    // Cannot DRY this up and dynamically create paths because fs.readdirSync
    // doesn't browserify well with a variable path. See https://github.com/substack/brfs/issues/36.
    const partialStyles = [
      fs.readFileSync(__dirname + '/../report/partials/cards.css', 'utf8'),
      fs.readFileSync(__dirname + '/../report/partials/critical-request-chains.css', 'utf8'),
      fs.readFileSync(__dirname + '/../report/partials/table.css', 'utf8'),
      fs.readFileSync(__dirname + '/../report/partials/url-list.css', 'utf8'),
      fs.readFileSync(__dirname + '/../report/partials/user-timings.css', 'utf8')
    ];

    return [
      fs.readFileSync(path.join(__dirname, './styles/report.css'), 'utf8'),
      ...partialStyles
    ];
  }

  /**
   * Gets the script for the report UI
   * @param {string} reportContext
   * @return {!Array<string>} an array of scripts
   */
  getReportJS(reportContext) {
    if (reportContext === 'devtools') {
      return [];
    } else {
      return [
        fs.readFileSync(path.join(__dirname, './scripts/logger.js'), 'utf8'),
        fs.readFileSync(path.join(__dirname, '../lib/file-namer.js'), 'utf8'),
        fs.readFileSync(path.join(__dirname, './scripts/lighthouse-report.js'), 'utf8')
      ];
    }
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
   * @return {string} HTML of the exception page.
   */
  renderException(err, results) {
    const template = reportTemplate.report.templates.exception;
    return template({
      errMessage: err.message,
      errStack: err.stack,
      css: this.getReportCSS(),
      results: JSON.stringify(results, null, 2)
    });
  }

  /**
   * Register the partial used for each extendedInfo under the audit's name.
   * @param {!Object} audits Lighthouse results.audits.
   */
  _registerPartials(audits) {
    Object.keys(audits).forEach(auditName => {
      const audit = audits[auditName];

      if (!audit.extendedInfo) {
        return;
      }

      const partialName = audit.extendedInfo.formatter;
      const partial = reportPartials.report.partials[partialName];
      if (!partial) {
        throw new Error(`${auditName} requested unknown partial for formatting`);
      }

      Handlebars.registerPartial(audit.name, Handlebars.template(partial));
    });
  }

  /**
   * Generates the Lighthouse report HTML.
   * @param {!Object} results Lighthouse results.
   * @param {!string} reportContext What app is requesting the report (eg. devtools, extension)
   * @param {?Object} reportsCatalog Basic info about all the reports to include in left nav bar
   * @return {string} HTML of the report page.
   */
  generateHTML(results, reportContext = 'extension', reportsCatalog) {
    this._registerPartials(results.audits);

    results.aggregations.forEach(aggregation => {
      aggregation.score.forEach(score => {
        // Map subItem strings to auditResults from results.audits.
        // Coming soon events are not in auditResults, but rather still in subItems.
        score.subItems = score.subItems.map(subItem => results.audits[subItem] || subItem);
      });
    });

    const template = Handlebars.template(reportTemplate.report.templates['report-template']);

    return template({
      url: results.url,
      lighthouseVersion: results.lighthouseVersion,
      generatedTime: results.generatedTime,
      lhresults: this._escapeScriptTags(JSON.stringify(results, null, 2)),
      stylesheets: this.getReportCSS(),
      reportContext: reportContext,
      scripts: this.getReportJS(reportContext),
      aggregations: results.aggregations,
      auditsByCategory: this._createPWAAuditsByCategory(results.aggregations),
      runtimeConfig: results.runtimeConfig,
      reportsCatalog
    });
  }
}

module.exports = ReportGenerator;
