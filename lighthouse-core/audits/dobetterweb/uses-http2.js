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
 * @fileoverview Audit a page to ensure that resource loaded over its own
 * origin are over the http/2 protocol.
 */

'use strict';

const url = require('url');
const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class UsesHTTP2Audit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'uses-http2',
      description: 'Site uses HTTP/2 for its own resources',
      helpText: 'h2 offers many benefits over its http/1.1 predecessor: binary, multiplexing, server push, etc. See <a href="https://http2.github.io/faq/" target="_blank">this FAQ</a> for more information.',
      requiredArtifacts: ['URL', 'networkRecords']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const networkRecords = artifacts.networkRecords[Audit.DEFAULT_PASS];
    const finalHost = url.parse(artifacts.URL.finalUrl).host;

    // Filter requests that are on the same host as the page and not over h2.
    const resources = networkRecords.filter(record => {
      const requestHost = url.parse(record._url).host;
      const sameHost = requestHost === finalHost;
      const notH2 = /HTTP\/[01][\.\d]?/i.test(record.protocol);
      return sameHost && notH2;
    }).map(record => {
      return {
        label: record.protocol,
        url: record.url // .url is a getter and not copied over for the assign.
      };
    });

    let displayValue = '';
    if (resources.length > 1) {
      displayValue = `${resources.length} resources were not served over h2`;
    } else if (resources.length === 1) {
      displayValue = `${resources.length} resource was not served over h2`;
    }

    return UsesHTTP2Audit.generateAuditResult({
      rawValue: resources.length === 0,
      displayValue: displayValue,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: resources
      }
    });
  }
}

module.exports = UsesHTTP2Audit;
