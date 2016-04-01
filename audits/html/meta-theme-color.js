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

const validColor = require('../../helpers/web-inspector').Color.parse;
const Audit = require('../audit');

class ThemeColor extends Audit {
  /**
   * @override
   */
  static get tags() {
    return ['HTML'];
  }

  /**
   * @override
   */
  static get name() {
    return 'theme-color-meta';
  }

  /**
   * @override
   */
  static get description() {
    return 'Site has a theme-color meta tag';
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const themeColorMeta = artifacts.themeColorMeta;
    if (!themeColorMeta) {
      return ThemeColor.generateAuditResult(false, undefined,
          'No valid theme-color meta tag found.');
    }

    if (!validColor(themeColorMeta)) {
      return ThemeColor.generateAuditResult(false, themeColorMeta,
          'The theme-color meta tag did not contain a valid CSS color.');
    }

    return ThemeColor.generateAuditResult(true, themeColorMeta);
  }
}

module.exports = ThemeColor;
