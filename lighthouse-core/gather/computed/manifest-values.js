/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const icons = require('../../lib/icons');

const PWA_DISPLAY_VALUES = ['minimal-ui', 'fullscreen', 'standalone'];

// Historically, Chrome recommended 12 chars as the maximum short_name length to prevent truncation.
// See #69 for more discussion & https://developer.chrome.com/apps/manifest/name#short_name
const SUGGESTED_SHORTNAME_LENGTH = 12;

class ManifestValues extends ComputedArtifact {

  get name() {
    return 'ManifestValues';
  }

  static get validityIds() {
    return ['hasManifest', 'hasParseableManifest'];
  }

  static get manifestChecks() {
    return [
      {
        id: 'hasStartUrl',
        failureText: 'Manifest does not contain a `start_url`',
        validate: manifest => !!manifest.value.start_url.value
      },
      {
        id: 'hasIconsAtLeast192px',
        failureText: 'Manifest does not have icons at least 192px',
        validate: manifest => icons.doExist(manifest.value) &&
            icons.sizeAtLeast(192, /** @type {!Manifest} */ (manifest.value)).length > 0
      },
      {
        id: 'hasIconsAtLeast512px',
        failureText: 'Manifest does not have icons at least 512px',
        validate: manifest => icons.doExist(manifest.value) &&
            icons.sizeAtLeast(512, /** @type {!Manifest} */ (manifest.value)).length > 0
      },
      {
        id: 'hasPWADisplayValue',
        failureText: 'Manifest\'s `display` value is not one of: ' + PWA_DISPLAY_VALUES.join(' | '),
        validate: manifest => PWA_DISPLAY_VALUES.includes(manifest.value.display.value)
      },
      {
        id: 'hasBackgroundColor',
        failureText: 'Manifest does not have `background_color`',
        validate: manifest => !!manifest.value.background_color.value
      },
      {
        id: 'hasThemeColor',
        failureText: 'Manifest does not have `theme_color`',
        validate: manifest => !!manifest.value.theme_color.value
      },
      {
        id: 'hasShortName',
        failureText: 'Manifest does not have `short_name`',
        validate: manifest => !!manifest.value.short_name.value
      },
      {
        id: 'shortNameLength',
        failureText: 'Manifest `short_name` will be truncated when displayed on the homescreen',
        validate: manifest => !!manifest.value.short_name.value &&
            manifest.value.short_name.value.length <= SUGGESTED_SHORTNAME_LENGTH
      },
      {
        id: 'hasName',
        failureText: 'Manifest does not have `name`',
        validate: manifest => !!manifest.value.name.value
      }
    ];
  }

  /**
   * Returns results of all manifest checks
   * @param {Manifest} manifest
   * @return {{isParseFailure: !boolean, parseFailureReason: ?string, allChecks: !Array}}
   */
  compute_(manifest) {
    // if the manifest isn't there or is invalid json, we report that and bail
    let parseFailureReason;

    if (manifest === null) {
      parseFailureReason = 'No manifest was fetched';
    }
    if (manifest && manifest.value === undefined) {
      parseFailureReason = 'Manifest failed to parse as valid JSON';
    }
    if (parseFailureReason) {
      return {
        isParseFailure: true,
        parseFailureReason,
        allChecks: []
      };
    }

    // manifest is valid, so do the rest of the checks
    const remainingChecks = ManifestValues.manifestChecks.map(item => {
      item.passing = item.validate(manifest);
      return item;
    });

    return {
      isParseFailure: false,
      parseFailureReason,
      allChecks: remainingChecks
    };
  }

}

module.exports = ManifestValues;
