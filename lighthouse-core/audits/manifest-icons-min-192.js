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
const icons = require('../lib/icons');

class ManifestIconsMin192 extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Manifest',
      name: 'manifest-icons-min-192',
      description: 'Manifest contains icons at least 192px',
      helpText: 'A 192px icon ensures that your app\'s icon displays well ' +
          'on the homescreens of the largest mobile devices. [Learn ' +
          'more](https://developers.google.com/web/tools/lighthouse/audits/manifest-contains-192px-icon).',
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
      return ManifestIconsMin192.generateAuditResult({
        rawValue: false
      });
    }

    const manifest = artifacts.Manifest.value;
    if (icons.doExist(manifest) === false) {
      return ManifestIconsMin192.generateAuditResult({
        rawValue: false
      });
    }

    const matchingIcons = icons.sizeAtLeast(192, /** @type {!Manifest} */ (manifest));

    let displayValue;
    let debugString;
    if (matchingIcons.length) {
      displayValue = `found sizes: ${matchingIcons.join(', ')}`;
    } else {
      debugString = 'No icons are at least 192px';
    }

    return ManifestIconsMin192.generateAuditResult({
      rawValue: !!matchingIcons.length,
      displayValue,
      debugString
    });
  }
}

module.exports = ManifestIconsMin192;
