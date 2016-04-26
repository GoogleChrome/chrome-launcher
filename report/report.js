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

const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

class Report {

  constructor() {
    Handlebars.registerHelper('generated', _ => {
      const options = {
        day: 'numeric', month: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        timeZoneName: 'short'
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      return formatter.format(new Date());
    });

    Handlebars.registerHelper('generateAnchor', shortName => {
      return shortName.toLowerCase().replace(/\s/gim, '');
    });

    Handlebars.registerHelper('getItemValue', value => {
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }

      return value;
    });

    Handlebars.registerHelper('getItemRating', value => {
      if (typeof value === 'boolean') {
        return value ? 'good' : 'poor';
      }

      let rating = 'poor';
      if (value > 0.33) {
        rating = 'average';
      }
      if (value > 0.66) {
        rating = 'good';
      }

      return rating;
    });

    Handlebars.registerHelper('convertToPercentage', value => {
      return Math.floor(value * 100);
    });

    Handlebars.registerHelper('getItemRawValue', subItem => {
      let value = '';
      if (typeof subItem.rawValue !== 'undefined') {
        let optimalValue = '';
        if (typeof subItem.optimalValue !== 'undefined') {
          optimalValue = ` / ${subItem.optimalValue}`;
        }

        value = `&nbsp;(${subItem.rawValue}${optimalValue})`;
      }

      return value;
    });
  }

  getReportHTML() {
    return fs.readFileSync(path.join(__dirname, './templates/report.html'), 'utf8');
  }

  getReportCSS() {
    return fs.readFileSync(path.join(__dirname, './styles/report.css'), 'utf8');
  }

  getReportJS() {
    return fs.readFileSync(path.join(__dirname, './scripts/report.js'), 'utf8');
  }

  generateHTML(results) {
    const totalScore =
        (results.aggregations.reduce((prev, aggregation) => {
          return prev + aggregation.score.overall;
        }, 0) /
        results.aggregations.length);

    const template = Handlebars.compile(this.getReportHTML());
    return template({
      url: results.url,
      totalScore: Math.round(totalScore * 100),
      css: this.getReportCSS(),
      script: this.getReportJS(),
      aggregations: results.aggregations
    });
  }
}

module.exports = Report;
