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

const URL = require('../../lib/url-shim');
const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class ExternalAnchorsUseRelNoopenerAudit extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'external-anchors-use-rel-noopener',
      description: 'Site opens external anchors using rel="noopener"',
      helpText: 'Open new tabs using <code>rel="noopener"</code> to improve performance and ' +
          'prevent security vulnerabilities. <a href="https://developers.google.com/web/tools/' +
          'lighthouse/audits/noopener" target="_blank" rel="noopener">Learn more</a>.',
      requiredArtifacts: ['URL', 'AnchorsWithNoRelNoopener']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (artifacts.AnchorsWithNoRelNoopener === -1) {
      return ExternalAnchorsUseRelNoopenerAudit.generateAuditResult({
        rawValue: -1,
        debugString: 'Unknown error with the AnchorsWithNoRelNoopener gatherer.'
      });
    }

    const pageHost = new URL(artifacts.URL.finalUrl).host;
    // Filter usages to exclude anchors that are same origin
    // TODO: better extendedInfo for anchors with no href attribute:
    // https://github.com/GoogleChrome/lighthouse/issues/1233
    const failingAnchors = artifacts.AnchorsWithNoRelNoopener.usages
      .filter(anchor => anchor.href === '' || new URL(anchor.href).host !== pageHost)
      .map(anchor => {
        return {
          url: '<a' +
              (anchor.href ? ` href="${anchor.href}"` : '') +
              (anchor.target ? ` target="${anchor.target}"` : '') +
              (anchor.rel ? ` rel="${anchor.rel}"` : '') + '>'
        };
      });

    return ExternalAnchorsUseRelNoopenerAudit.generateAuditResult({
      rawValue: failingAnchors.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: failingAnchors
      }
    });
  }
}

module.exports = ExternalAnchorsUseRelNoopenerAudit;
