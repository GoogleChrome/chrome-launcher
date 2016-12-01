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
 * @fileoverview Audits a page to see if it is requesting usage of the notification API on
 * page load. This is often a sign of poor user experience because it lacks context.
 */

'use strict';

const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class NotificationOnStart extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'UX',
      name: 'notification-on-start',
      description: 'Page does not automatically request notification permissions on page load',
      helpText: 'Using notifications without context is a poor user experience. Always tie API ' +
                'permissions to user interactions.',
      requiredArtifacts: ['NotificationOnStart']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (typeof artifacts.NotificationOnStart === 'undefined' ||
        artifacts.NotificationOnStart.value === -1) {
      let debugString = 'Unknown error with the NotificationOnStart gatherer';
      if (typeof artifacts.NotificationOnStart === 'undefined') {
        debugString = 'NotificationOnStart gatherer did not run';
      } else if (artifacts.NotificationOnStart.debugString) {
        debugString = artifacts.NotificationOnStart.debugString;
      }

      return NotificationOnStart.generateAuditResult({
        rawValue: -1,
        debugString
      });
    }

    const results = artifacts.NotificationOnStart.usage.map(err => {
      return Object.assign({
        label: `line: ${err.line}, col: ${err.col}`
      }, err);
    });

    return NotificationOnStart.generateAuditResult({
      rawValue: results.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      }
    });
  }

}

module.exports = NotificationOnStart;
