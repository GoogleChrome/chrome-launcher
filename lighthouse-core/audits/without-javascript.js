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

class WithoutJavaScript extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'JavaScript',
      name: 'without-javascript',
      description: 'Page contains some content when its scripts are not available',
      helpText: 'Your app should display some content when JavaScript is disabled, even if it\'s just a warning to the user that JavaScript is required to use the app. <a href="https://developers.google.com/web/tools/lighthouse/audits/no-js" target="_blank" rel="noreferrer noopener">Learn more</a>.',
      requiredArtifacts: ['HTMLWithoutJavaScript']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const artifact = artifacts.HTMLWithoutJavaScript;
    if (!artifact || typeof artifact.value !== 'string') {
      return WithoutJavaScript.generateAuditResult({
        rawValue: -1,
        debugString: (artifact && artifact.debugString) ||
          'HTMLWithoutJavaScript gatherer did not complete successfully'
      });
    }

    if (artifact.value.trim() === '') {
      return WithoutJavaScript.generateAuditResult({
        rawValue: false,
        debugString: 'The page body should render some content if its scripts are not available.'
      });
    }

    return WithoutJavaScript.generateAuditResult({
      rawValue: true
    });
  }
}

module.exports = WithoutJavaScript;
