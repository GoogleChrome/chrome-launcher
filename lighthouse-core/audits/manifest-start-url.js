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

class ManifestStartUrl extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Manifest',
      name: 'manifest-start-url',
      description: 'Manifest contains `start_url`',
      helpText: 'Add a `start_url` to instruct the browser to launch a ' +
          'specific URL whenever your app is launched from a homescreen. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/manifest-contains-start_url).',
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
      return ManifestStartUrl.generateAuditResult({
        rawValue: false
      });
    }

    const manifest = artifacts.Manifest.value;
    return ManifestStartUrl.generateAuditResult({
      rawValue: !!manifest.start_url.value
    });
  }
}

module.exports = ManifestStartUrl;
