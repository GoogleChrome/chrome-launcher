/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MultiCheckAudit = require('./multi-check-audit');
const validColor = require('../lib/web-inspector').Color.parse;

/**
 * @fileoverview
 * Audits if a page is configured for a themed address bar
 *
 * Requirements:
 *   * manifest is not empty
 *   * manifest has a valid theme_color
 *   * HTML has a valid theme-color meta
 */

class ThemedOmnibox extends MultiCheckAudit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'PWA',
      name: 'themed-omnibox',
      description: 'Address bar matches brand colors',
      helpText: 'The browser address bar can be themed to match your site. A `theme-color` [meta tag](https://developers.google.com/web/updates/2014/11/Support-for-theme-color-in-Chrome-39-for-Android) will upgrade the address bar when a user browses the site, and the [manifest theme-color](https://developers.google.com/web/updates/2015/08/using-manifest-to-set-sitewide-theme-color) will apply the same theme site-wide once it\'s been added to homescreen.',
      requiredArtifacts: ['Manifest', 'ThemeColor']
    };
  }

  static assessMetaThemecolor(themeColorMeta, failures) {
    if (themeColorMeta === null) {
      failures.push('No `<meta name="theme-color">` tag found');
    } else if (!validColor(themeColorMeta)) {
      failures.push('The theme-color meta tag did not contain a valid CSS color');
    }
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

  static audit_(artifacts) {
    const failures = [];

    return artifacts.requestManifestValues(artifacts.Manifest).then(manifestValues => {
      ThemedOmnibox.assessManifest(manifestValues, failures);
      ThemedOmnibox.assessMetaThemecolor(artifacts.ThemeColor, failures);

      return {
        failures,
        manifestValues,
        themeColor: artifacts.ThemeColor
      };
    });
  }
}

module.exports = ThemedOmnibox;
