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

const path = require('path');
const fs = require('fs');
const Formatter = require('./formatter');
const html = fs.readFileSync(path.join(__dirname, 'partials/accessibility.html'), 'utf8');

class Accessibilty extends Formatter {
  static getFormatter(type) {
    switch (type) {
      case 'pretty':
        return function(info) {
          if (info === null ||
              typeof info === 'undefined' ||
              typeof info.impact === 'undefined' ||
              typeof info.helpUrl === 'undefined' ||
              typeof info.nodes === 'undefined' ||
              !Array.isArray(info.nodes)) {
            return '';
          }

          const output = `      - Rating: ${info.impact}\n` +
          `      - See: ${info.helpUrl}\n` +
          `      - Nodes: ${info.nodes.length} nodes identified (see HTML output for details)\n`;
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
      gt(a, b) {
        return a > b;
      }
    };
  }
}

module.exports = Accessibilty;
