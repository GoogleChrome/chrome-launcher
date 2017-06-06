/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to ensure that resource loaded over its own
 * origin are over the http/2 protocol.
 */

'use strict';

const URL = require('../../lib/url-shim');
const Audit = require('../audit');
const Formatter = require('../../report/formatter');

class UsesHTTP2Audit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'uses-http2',
      description: 'Uses HTTP/2 for its own resources',
      helpText: 'HTTP/2 offers many benefits over HTTP/1.1, including binary headers, ' +
          'multiplexing, and server push. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/http2).',
      requiredArtifacts: ['URL', 'devtoolsLogs']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return artifacts.requestNetworkRecords(devtoolsLogs).then(networkRecords => {
      const finalHost = new URL(artifacts.URL.finalUrl).host;

      // Filter requests that are on the same host as the page and not over h2.
      const resources = networkRecords.filter(record => {
        const requestHost = new URL(record._url).host;
        const sameHost = requestHost === finalHost;
        const notH2 = /HTTP\/[01][\.\d]?/i.test(record.protocol);
        return sameHost && notH2;
      }).map(record => {
        return {
          protocol: record.protocol,
          url: record.url // .url is a getter and not copied over for the assign.
        };
      });

      let displayValue = '';
      if (resources.length > 1) {
        displayValue = `${resources.length} requests were not handled over h2`;
      } else if (resources.length === 1) {
        displayValue = `${resources.length} request was not handled over h2`;
      }

      const headings = [
        {key: 'url', itemType: 'url', text: 'URL'},
        {key: 'protocol', itemType: 'text', text: 'Protocol'},
      ];
      const details = Audit.makeV2TableDetails(headings, resources);

      return {
        rawValue: resources.length === 0,
        displayValue: displayValue,
        extendedInfo: {
          formatter: Formatter.SUPPORTED_FORMATS.TABLE,
          value: {
            results: resources,
            tableHeadings: {url: 'URL', protocol: 'Protocol'}
          }
        },
        details,
      };
    });
  }
}

module.exports = UsesHTTP2Audit;
