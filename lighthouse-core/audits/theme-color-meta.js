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

const validColor = require('../lib/web-inspector').Color.parse;
const Audit = require('./audit');

class ThemeColor extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'HTML',
      name: 'theme-color-meta',
      description: 'Has a `<meta name="theme-color">` tag',
      requiredArtifacts: ['ThemeColor']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const themeColorMeta = artifacts.ThemeColor;
    if (themeColorMeta === null) {
      return ThemeColor.generateAuditResult({
        rawValue: false
      });
    }

    if (!validColor(themeColorMeta)) {
      return ThemeColor.generateAuditResult({
        displayValue: themeColorMeta,
        rawValue: false,
        debugString: 'The theme-color meta tag did not contain a valid CSS color.'
      });
    }

    return ThemeColor.generateAuditResult({
      displayValue: themeColorMeta,
      rawValue: true
    });
  }
}

module.exports = ThemeColor;
