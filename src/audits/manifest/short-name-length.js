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
   * @override
   */
  static get tags() {
    return ['Manifest'];
  }

  /**
   * @override
   */
  static get name() {
    return 'manifest-short-name-length';
  }

  /**
   * @override
   */
  static get description() {
    return 'App short_name won\'t be truncated';
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

    if (manifest && manifest.short_name && manifest.short_name.value) {
      // Historically, Chrome recommended 12 chars as the maximum length to prevent truncation.
      // See #69 for more discussion.
      isShortNameShortEnough = (manifest.short_name.value.length <= suggestedLength);
      if (!isShortNameShortEnough) {
        debugString = `${suggestedLength} chars is the suggested maximum homescreen label length`;
        debugString += ` (Found: ${manifest.short_name.value.length} chars).`;
      }
    }

    return ManifestShortNameLength.generateAuditResult(
      isShortNameShortEnough,
      undefined,
      debugString
    );
  }
}

module.exports = ManifestShortNameLength;
