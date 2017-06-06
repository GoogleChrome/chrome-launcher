/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MultiCheckAudit = require('./multi-check-audit');

/**
 * @fileoverview
 * Audits if a page is configured for a custom splash screen when launched
 * https://github.com/GoogleChrome/lighthouse/issues/24
 *
 * Requirements:
 *   * manifest is not empty
 *   * manifest has a valid name
 *   * manifest has a valid background_color
 *   * manifest has a valid theme_color
 *   * manifest contains icon that's a png and size >= 512px
 */

class SplashScreen extends MultiCheckAudit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'PWA',
      name: 'splash-screen',
      description: 'Configured for a custom splash screen',
      helpText: 'A default splash screen will be constructed for your app, but satisfying these requirements guarantee a high-quality [splash screen](https://developers.google.com/web/updates/2015/10/splashscreen) that transitions the user from tapping the home screen icon to your app\'s first paint',
      requiredArtifacts: ['Manifest']
    };
  }

  static assessManifest(manifestValues, failures) {
    if (manifestValues.isParseFailure) {
      failures.push(manifestValues.parseFailureReason);
      return;
    }

    const splashScreenCheckIds = [
      'hasName',
      'hasBackgroundColor',
      'hasThemeColor',
      'hasIconsAtLeast512px'
    ];

    manifestValues.allChecks
      .filter(item => splashScreenCheckIds.includes(item.id))
      .forEach(item => {
        if (!item.passing) {
          failures.push(item.failureText);
        }
      });
  }


  static audit_(artifacts) {
    const failures = [];

    return artifacts.requestManifestValues(artifacts.Manifest).then(manifestValues => {
      SplashScreen.assessManifest(manifestValues, failures);

      return {
        failures,
        manifestValues
      };
    });
  }
}

module.exports = SplashScreen;
