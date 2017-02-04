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

/**
 * @fileoverview Audits a page to see if it is requesting the geolocation API on
 * page load. This is often a sign of poor user experience because it lacks context.
 */

'use strict';

const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class GeolocationOnStart extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'UX',
      name: 'geolocation-on-start',
      description: 'Avoids requesting the geolocation permission on page load',
      helpText: 'Users are mistrustful of or confused by sites that request their ' +
          'location without context. Consider tying the request to user gestures instead. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/geolocation-on-load).',
      requiredArtifacts: ['GeolocationOnStart']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const results = artifacts.GeolocationOnStart.map(err => {
      return Object.assign({
        label: `line: ${err.line}, col: ${err.col}`
      }, err);
    });

    return GeolocationOnStart.generateAuditResult({
      rawValue: results.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      }
    });
  }

}

module.exports = GeolocationOnStart;
