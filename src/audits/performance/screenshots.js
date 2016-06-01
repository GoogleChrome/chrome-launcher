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
const Formatter = require('../../../formatters/formatter');

class Screenshots extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'screenshots',
      description: 'Screenshots of all captured frames',
      requiredArtifacts: ['screenshots']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResultInput}
   */
  static audit(artifacts) {
    const screenshots = artifacts.screenshots;

    if (typeof artifacts.screenshots === 'undefined') {
      return Screenshots.generateAuditResult({
        value: -1,
        debugString: 'No screenshot artifact'
      });
    }

    return Screenshots.generateAuditResult({
      value: screenshots.length || 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.NULL,
        value: screenshots
      }
    });
  }
}

module.exports = Screenshots;
