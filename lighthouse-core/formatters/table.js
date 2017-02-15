/**
 * @license
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

const Formatter = require('./formatter');
const path = require('path');
const fs = require('fs');
const html = fs.readFileSync(path.join(__dirname, 'partials/table.html'), 'utf8');

class Table extends Formatter {
  static getFormatter(type) {
    switch (type) {
      case 'pretty':
        return result => {
          let output = '';

          if (!result || !result.results || !result.tableHeadings) {
            return output;
          }

          const table = Table.createTable(result.tableHeadings, result.results);
          const headings = Object.keys(result.tableHeadings).map(key => {
            return result.tableHeadings[key].toUpperCase();
          });

          output += `      ${headings.join(' ')}\n`;

          table.rows.forEach(row => {
            output += '      ';
            row.cols.forEach(col => {
              // Omit code snippet cols and image previews.
              if (!col || col.startsWith('`') && col.endsWith('`') ||
                  col.startsWith('[![Image preview]')) {
                output += '- ';
              } else {
                output += `${col} `;
              }
            });
            output += '\n';
          });
          return output;
        };

      case 'html':
        // Returns a handlebars string to be used by the Report.
        return html;

      default:
        throw new Error('Unknown formatter type');
    }
  }

  /**
   * Preps a formatted table (headings/col vals) for output.
   * @param {!Object<string>} headings for the table. The order of this
   *     object's key/value pairs determines the order of the HTML table headings.
   *     There is special handling for certain keys:
   *       preview {url: string, mimeType: string}: For image mimetypes, wraps
   *           the value in a markdown image.
   *       code: wraps the value in single ` for a markdown code snippet.
   *       pre: wraps the value in triple ``` for a markdown code block.
   *       lineCol: combines the values for the line and col keys into a single
   *                value "line/col".
   *       isEval: returns "yes" if the script was eval'd.
   *       All other values are passed through as is.
   * @param {!Array<!Object>} results Audit results.
   * @return {{headings: !Array<string>, rows: !Array<{cols: !Array<*>}>}}
   */
  static createTable(headings = {}, results = []) {
    const headingKeys = Object.keys(headings);

    const rows = results.map(result => {
      const cols = headingKeys.map(key => {
        let value = result[key];
        if (typeof value === 'undefined') {
          value = '--';
        }

        switch (key) {
          case 'preview':
            if (/^image/.test(value.mimeType)) {
              // Markdown can't handle URLs with parentheses which aren't automatically encoded
              const encodedUrl = value.url.replace(/\)/g, '%29');
              return `[![Image preview](${encodedUrl} "Image preview")](${encodedUrl})`;
            }
            return '';
          case 'code':
            return '`' + value.trim() + '`';
          case 'pre':
            return '\`\`\`\n' + result[key].trim() + '\`\`\`';
          case 'lineCol':
            return `${result.line}:${result.col}`;
          case 'isEval':
            return value ? 'yes' : '';
          default:
            return String(value);
        }
      });

      return {cols};
    });

    headings = headingKeys.map(key => headings[key]);

    return {headings, rows, headingKeys};
  }

  static getHelpers() {
    return {
      createTable(headings, results, opts) {
        return opts.fn(Table.createTable(headings, results));
      }
    };
  }
}

module.exports = Table;
