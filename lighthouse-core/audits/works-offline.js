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

class WorksOffline extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Offline',
      name: 'works-offline',
      description: 'Responds with a 200 when offline',
      helpText: 'If you\'re building a Progressive Web App, consider using a service worker so ' +
          'that your app can work offline. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/http-200-when-offline).',
      requiredArtifacts: ['Offline']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return WorksOffline.generateAuditResult({
      rawValue: artifacts.Offline === 200
    });
  }
}

module.exports = WorksOffline;
