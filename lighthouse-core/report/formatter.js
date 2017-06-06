/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');

// Auto convert partial filenames to lookup for audits to use.
const formatters = {};
fs.readdirSync(__dirname + '/partials')
  .filter(filename => filename.endsWith('.html'))
  .forEach(filename => {
    const baseName = filename.replace(/\.html$/, '');
    const capsName = baseName.replace(/-/g, '_').toUpperCase();
    formatters[capsName] = baseName;
  });


class Formatter {
  /**
   * Getter that returns a list of supported formatters, mapping an all-caps
   * name to the basename of the available formatter partials
   * (e.g. `CRITICAL_REQUEST_CHAINS` to `critical-request-chains).
   * @return {!Object<string, string>}
   */
  static get SUPPORTED_FORMATS() {
    return formatters;
  }
}

module.exports = Formatter;
