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

const Formatter = require('./formatter');
const path = require('path');
const fs = require('fs');
const html = fs.readFileSync(path.join(__dirname, 'partials/estimated-input-latency.html'), 'utf8');

class EstimatedInputLatencyFormatter extends Formatter {
  static getFormatter(type) {
    switch (type) {
      case 'pretty':
        return function(percentiles) {
          if (!percentiles || !Array.isArray(percentiles)) {
            return '';
          }

          const output = percentiles.reduce((output, result) => {
            const percentile = Math.round(result.percentile * 100);
            const value = result.time.toFixed(1);
            return output + `    - ${percentile}%: ${value}ms\n`;
          }, '');

          return output;
        };

      case 'html':
        // Returns a handlebars string to be used by the Report.
        return html;

      default:
        throw new Error('Unknown formatter type');
    }
  }

  static getHelpers() {
    return {
      percentile(value) {
        return Math.round(value * 100);
      },
      fixedTenths(value) {
        return value.toFixed(1);
      }
    };
  }
}

module.exports = EstimatedInputLatencyFormatter;
