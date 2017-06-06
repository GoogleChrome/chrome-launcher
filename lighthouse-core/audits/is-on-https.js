/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Formatter = require('../report/formatter');
const URL = require('../lib/url-shim');

const SECURE_SCHEMES = ['data', 'https', 'wss', 'blob', 'chrome', 'chrome-extension'];
const SECURE_DOMAINS = ['localhost', '127.0.0.1'];

class HTTPS extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Security',
      name: 'is-on-https',
      description: 'Uses HTTPS',
      helpText: 'All sites should be protected with HTTPS, even ones that don\'t handle ' +
          'sensitive data. HTTPS prevents intruders from tampering with or passively listening ' +
          'in on the communications between your app and your users, and is a prerequisite for ' +
          'HTTP/2 and many new web platform APIs. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/https).',
      requiredArtifacts: ['devtoolsLogs']
    };
  }

  /**
   * @param {{scheme: string, domain: string}} record
   * @return {boolean}
   */
  static isSecureRecord(record) {
    return SECURE_SCHEMES.includes(record.scheme) || SECURE_DOMAINS.includes(record.domain);
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return artifacts.requestNetworkRecords(devtoolsLogs).then(networkRecords => {
      const insecureRecords = networkRecords
          .filter(record => !HTTPS.isSecureRecord(record))
          .map(record => ({url: URL.elideDataURI(record.url)}));

      let displayValue = '';
      if (insecureRecords.length > 1) {
        displayValue = `${insecureRecords.length} insecure requests found`;
      } else if (insecureRecords.length === 1) {
        displayValue = `${insecureRecords.length} insecure request found`;
      }

      return {
        rawValue: insecureRecords.length === 0,
        displayValue,
        extendedInfo: {
          formatter: Formatter.SUPPORTED_FORMATS.URL_LIST,
          value: insecureRecords
        },
        details: {
          type: 'list',
          header: {type: 'text', text: 'Insecure URLs:'},
          items: insecureRecords.map(record => ({type: 'url', text: record.url})),
        }
      };
    });
  }
}

module.exports = HTTPS;
