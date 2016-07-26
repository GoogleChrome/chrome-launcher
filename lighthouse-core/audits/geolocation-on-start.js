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

class GeolocationOnStart extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'UX',
      name: 'geolocation',
      description: 'Page does not automatically request geolocation',
      requiredArtifacts: ['GeolocationOnStart']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (typeof artifacts.GeolocationOnStart === 'undefined' ||
        artifacts.GeolocationOnStart === -1) {
      return GeolocationOnStart.generateAuditResult({
        rawValue: false,
        debugString: 'Unable to get geolocation values.'
      });
    }

    return GeolocationOnStart.generateAuditResult({
      rawValue: artifacts.GeolocationOnStart
    });
  }
}

module.exports = GeolocationOnStart;
