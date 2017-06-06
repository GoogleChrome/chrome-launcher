/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to ensure it is not using the Application Cache API.
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
      description: 'Avoids Application Cache',
      helpText: 'Application Cache has been [deprecated](https://html.spec.whatwg.org/multipage/browsers.html#offline) by [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers). Consider implementing an offline solution using the [Cache Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Cache).',
      requiredArtifacts: ['AppCacheManifest']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const usingAppcache = artifacts.AppCacheManifest !== null;
    const debugString = usingAppcache ?
        `Found <html manifest="${artifacts.AppCacheManifest}">.` : '';

    return {
      rawValue: !usingAppcache,
      debugString
    };
  }
}

module.exports = AppCacheManifestAttr;
