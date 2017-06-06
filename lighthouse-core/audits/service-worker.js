/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const URL = require('../lib/url-shim');
const Audit = require('./audit');

class ServiceWorker extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Offline',
      name: 'service-worker',
      description: 'Registers a Service Worker',
      helpText: 'The service worker is the technology that enables your app to use many ' +
         'Progressive Web App features, such as offline, add to homescreen, and push ' +
         'notifications. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/registered-service-worker).',
      requiredArtifacts: ['URL', 'ServiceWorker']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    // Find active service worker for this URL. Match against
    // artifacts.URL.finalUrl so audit accounts for any redirects.
    const versions = artifacts.ServiceWorker.versions;
    const url = artifacts.URL.finalUrl;

    const origin = new URL(url).origin;
    const matchingSW = versions.filter(v => v.status === 'activated')
        .find(v => new URL(v.scriptURL).origin === origin);

    return {
      rawValue: !!matchingSW
    };
  }
}

module.exports = ServiceWorker;
