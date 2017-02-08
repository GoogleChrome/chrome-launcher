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

class ManifestShortName extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Manifest',
      name: 'manifest-short-name',
      description: 'Manifest contains `short_name`',
      helpText: 'The `short_name` property is a requirement for Add ' +
          'To Homescreen. [Learn ' +
          'more](https://developers.google.com/web/tools/lighthouse/audits/manifest-contains-short_name).',
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
      return ManifestShortName.generateAuditResult({
        rawValue: false
      });
    }

    const manifest = artifacts.Manifest.value;
    return ManifestShortName.generateAuditResult({
      // When no shortname can be found we look for a name.
      rawValue: !!(manifest.short_name.value || manifest.name.value)
    });
  }
}

module.exports = ManifestShortName;
