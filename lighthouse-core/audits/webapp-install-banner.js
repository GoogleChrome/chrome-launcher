/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MultiCheckAudit = require('./multi-check-audit');
const SWAudit = require('./service-worker');

/**
 * @fileoverview
 * Audits if a page is configured to prompt users with the webapp install banner.
 * https://github.com/GoogleChrome/lighthouse/issues/23#issuecomment-270453303
 *
 * Requirements:
 *   * manifest is not empty
 *   * manifest has valid start url
 *   * manifest has a valid name
 *   * manifest has a valid shortname
 *   * manifest display property is standalone, minimal-ui, or fullscreen
 *   * manifest contains icon that's a png and size >= 192px
 *   * SW is registered, and it owns this page and the manifest's start url
 *   * Site engagement score of 2 or higher

 * This audit covers these requirements with the following exceptions:
 *   * it doesn't consider SW controlling the starturl
 *   * it doesn't consider the site engagement score (naturally)
 */

class WebappInstallBanner extends MultiCheckAudit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'PWA',
      name: 'webapp-install-banner',
      description: 'User can be prompted to Install the Web App',
      helpText: 'While users can manually add your site to their homescreen, the [prompt (aka app install banner)](https://developers.google.com/web/fundamentals/engage-and-retain/app-install-banners/) will proactively prompt the user to install the app if the various requirements are met and the user has moderate engagement with your site.',
      requiredArtifacts: ['URL', 'ServiceWorker', 'Manifest', 'StartUrl']
    };
  }

  static assessManifest(manifestValues, failures) {
    if (manifestValues.isParseFailure) {
      failures.push(manifestValues.parseFailureReason);
      return;
    }

    const bannerCheckIds = [
      'hasName',
      'hasShortName',
      'hasStartUrl',
      'hasPWADisplayValue',
      'hasIconsAtLeast192px'
    ];
    manifestValues.allChecks
      .filter(item => bannerCheckIds.includes(item.id))
      .forEach(item => {
        if (!item.passing) {
          failures.push(item.failureText);
        }
      });
  }


  static assessServiceWorker(artifacts, failures) {
    const hasServiceWorker = SWAudit.audit(artifacts).rawValue;
    if (!hasServiceWorker) {
      failures.push('Site does not register a Service Worker');
    }
  }

  static assessOfflineStartUrl(artifacts, failures) {
    const hasOfflineStartUrl = artifacts.StartUrl === 200;
    if (!hasOfflineStartUrl) {
      failures.push('Manifest start_url is not cached by a Service Worker');
    }
  }

  static audit_(artifacts) {
    const failures = [];

    return artifacts.requestManifestValues(artifacts.Manifest).then(manifestValues => {
      WebappInstallBanner.assessManifest(manifestValues, failures);
      WebappInstallBanner.assessServiceWorker(artifacts, failures);
      WebappInstallBanner.assessOfflineStartUrl(artifacts, failures);

      return {
        failures,
        manifestValues
      };
    });
  }
}

module.exports = WebappInstallBanner;
