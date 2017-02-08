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

class ManifestExists extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Manifest',
      name: 'manifest-exists',
      description: 'Manifest exists',
      helpText: 'The web app manifest is the technology that enables users ' +
          'to add your web app to their homescreen. [Learn ' +
          'more](https://developers.google.com/web/tools/lighthouse/audits/manifest-exists).',
      requiredArtifacts: ['Manifest']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (!artifacts.Manifest) {
      // Page has no manifest.
      return ManifestExists.generateAuditResult({
        rawValue: false
      });
    }

    return ManifestExists.generateAuditResult({
      rawValue: typeof artifacts.Manifest.value !== 'undefined',
      debugString: artifacts.Manifest.debugString
    });
  }
}

module.exports = ManifestExists;
