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

const Audit = require('../audit');

class ManifestShortNameLength extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Manifest',
      name: 'manifest-short-name-length',
      description: 'Manifest\'s short_name won\'t be truncated when displayed on homescreen',
      requiredArtifacts: ['manifest']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    let isShortNameShortEnough = false;
    let debugString;
    const manifest = artifacts.manifest.value;
    const suggestedLength = 12;

    if (manifest) {
      // When no shortname can be found we look for a name
      // Historically, Chrome recommended 12 chars as the maximum length to prevent truncation.
      // See #69 for more discussion.
      // https://developer.chrome.com/apps/manifest/name#short_name
      let manifestValue = manifest.short_name.value || manifest.name.value || '';
      isShortNameShortEnough = manifestValue && manifestValue.length <= suggestedLength;

      if (!isShortNameShortEnough) {
        debugString = `${suggestedLength} chars is the suggested maximum homescreen label length`;
        debugString += ` (Found: ${manifestValue.length} chars).`;
      }
    }

    return ManifestShortNameLength.generateAuditResult({
      value: isShortNameShortEnough,
      debugString
    });
  }
}

module.exports = ManifestShortNameLength;
