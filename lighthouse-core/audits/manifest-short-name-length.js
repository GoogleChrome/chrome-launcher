/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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


  static assessManifest(manifestValues, failures) {
    if (manifestValues.isParseFailure) {
      failures.push(manifestValues.parseFailureReason);
      return;
    }

    const themeColorCheck = manifestValues.allChecks.find(i => i.id === 'hasThemeColor');
    if (!themeColorCheck.passing) {
      failures.push(themeColorCheck.failureText);
    }
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return artifacts.requestManifestValues(artifacts.Manifest).then(manifestValues => {
      if (manifestValues.isParseFailure) {
        return {
          rawValue: false
        };
      }

      const hasShortName = manifestValues.allChecks.find(i => i.id === 'hasShortName').passing;
      if (!hasShortName) {
        return {
          rawValue: false,
          debugString: 'No short_name found in manifest.'
        };
      }

      const isShortEnough = manifestValues.allChecks.find(i => i.id === 'shortNameLength').passing;
      return {
        rawValue: isShortEnough
      };
    });
  }
}

module.exports = ManifestShortNameLength;
