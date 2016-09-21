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

class AppCacheManifestAttr extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Offline',
      name: 'appcache-manifest',
      description: 'Site isn\'t using Application Cache',
      requiredArtifacts: ['AppCacheManifest']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (typeof artifacts.AppCacheManifest === 'undefined' ||
        artifacts.AppCacheManifest === -1) {
      return AppCacheManifestAttr.generateAuditResult({
        rawValue: false,
        debugString: 'Unable to determine if you\'re using AppCache.'
      });
    }

    const usingAppcache = artifacts.AppCacheManifest !== null;
    const displayValue = usingAppcache ? `<html manifest="${artifacts.AppCacheManifest}">` : '';

    return AppCacheManifestAttr.generateAuditResult({
      rawValue: !usingAppcache,
      displayValue: displayValue
    });
  }
}

module.exports = AppCacheManifestAttr;
