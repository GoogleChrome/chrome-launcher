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

class HTTPS extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Security',
      name: 'is-on-https',
      description: 'Site is on HTTPS',
      helpText: 'All sites should be protected with HTTPS, even ones that don\'t handle ' +
          'sensitive data. HTTPS prevents intruders from tampering with or passively listening ' +
          'in on the communications between your app and your users, and is a prerequisite for ' +
          'HTTP/2 and many new web platform APIs. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/https).',
      requiredArtifacts: ['HTTPS']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return HTTPS.generateAuditResult({
      rawValue: artifacts.HTTPS.value,
      debugString: artifacts.HTTPS.debugString
    });
  }
}

module.exports = HTTPS;
