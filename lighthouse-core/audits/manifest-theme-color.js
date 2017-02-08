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

const Audit = require('./audit');

class ManifestThemeColor extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Manifest',
      name: 'manifest-theme-color',
      description: 'Manifest contains `theme_color`',
      helpText: 'Add a `theme_color` to set the color of the browser\'s ' +
          'address bar. [Learn ' +
          'more](https://developers.google.com/web/tools/lighthouse/audits/manifest-contains-theme_color).',
      requiredArtifacts: ['Manifest']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (!artifacts.Manifest || !artifacts.Manifest.value) {
      // Page has no manifest or was invalid JSON.
      return ManifestThemeColor.generateAuditResult({
        rawValue: false
      });
    }

    const manifest = artifacts.Manifest.value;
    return ManifestThemeColor.generateAuditResult({
      rawValue: !!manifest.theme_color.value
    });
  }
}

module.exports = ManifestThemeColor;
