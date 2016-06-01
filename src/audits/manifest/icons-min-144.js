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
const icons = require('../../lib/icons');

class ManifestIconsMin144 extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Manifest',
      name: 'manifest-icons-min-144',
      description: 'Manifest contains icons at least 144px',
      requiredArtifacts: ['manifest']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const manifest = artifacts.manifest.value;

    if (icons.doExist(manifest) === false) {
      return ManifestIconsMin144.generateAuditResult({
        value: false,
        debugString: 'WARNING: No icons found in the manifest'
      });
    }

    const matchingIcons = icons.sizeAtLeast(144, /** @type {!Manifest} */ (manifest));
    const foundSizesDebug = matchingIcons.length ?
        `Found icons of sizes: ${matchingIcons}` : undefined;
    return ManifestIconsMin144.generateAuditResult({
      value: !!matchingIcons.length,
      debugString: foundSizesDebug
    });
  }
}

module.exports = ManifestIconsMin144;

