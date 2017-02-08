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

class ManifestShortNameLength extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Manifest',
      name: 'manifest-short-name-length',
      description: 'Manifest\'s `short_name` won\'t be truncated when displayed on homescreen',
      helpText: 'Make your app\'s `short_name` less than 12 characters to ' +
          'ensure that it\'s not truncated on homescreens. [Learn ' +
          'more](https://developers.google.com/web/tools/lighthouse/audits/manifest-short_name-is-not-truncated).',
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
      return ManifestShortNameLength.generateAuditResult({
        rawValue: false
      });
    }

    // When no shortname can be found we look for a name.
    const manifest = artifacts.Manifest.value;
    const shortNameValue = manifest.short_name.value || manifest.name.value;

    if (!shortNameValue) {
      return ManifestShortNameLength.generateAuditResult({
        rawValue: false,
        debugString: 'No short_name found in manifest.'
      });
    }

    // Historically, Chrome recommended 12 chars as the maximum length to prevent truncation.
    // See #69 for more discussion.
    // https://developer.chrome.com/apps/manifest/name#short_name
    const suggestedLength = 12;
    const isShortNameShortEnough = shortNameValue.length <= suggestedLength;

    let debugString;
    if (!isShortNameShortEnough) {
      debugString = `${suggestedLength} chars is the suggested maximum homescreen label length`;
      debugString += ` (Found: ${shortNameValue.length} chars).`;
    }

    return ManifestShortNameLength.generateAuditResult({
      rawValue: isShortNameShortEnough,
      debugString
    });
  }
}

module.exports = ManifestShortNameLength;
