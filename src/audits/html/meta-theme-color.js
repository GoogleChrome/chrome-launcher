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

const validColor = require('../../lib/web-inspector').Color.parse;
const Audit = require('../audit');

class ThemeColor extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'HTML',
      name: 'theme-color-meta',
      description: 'HTML has a theme-color <meta>',
      requiredArtifacts: ['themeColorMeta']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const themeColorMeta = artifacts.themeColorMeta;
    if (!themeColorMeta) {
      return ThemeColor.generateAuditResult({
        value: false,
        debugString: 'No valid theme-color meta tag found.'
      });
    }

    if (!validColor(themeColorMeta)) {
      return ThemeColor.generateAuditResult({
        value: false,
        rawValue: themeColorMeta,
        debugString: 'The theme-color meta tag did not contain a valid CSS color.'
      });
    }

    return ThemeColor.generateAuditResult({
      value: true,
      rawValue: themeColorMeta
    });
  }
}

module.exports = ThemeColor;
