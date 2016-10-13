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
const html = fs.readFileSync(path.join(__dirname, 'partials/url-list.html'), 'utf8');

class UrlList extends Formatter {
  static getFormatter(type) {
    switch (type) {
      case 'pretty':
        return resources => {
          if (!Array.isArray(resources)) {
            return '';
          }

          let output = '';
          resources.forEach(resource => {
            output += `      ${resource.url}`;
            if (resource.label) {
              output += ` (${resource.label})`;
            }
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
}

module.exports = UrlList;
