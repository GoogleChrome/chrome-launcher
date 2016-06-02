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

class WithoutJavaScript extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'JavaScript',
      name: 'without-javascript',
      description: 'Page contains some content when its scripts are not available',
      requiredArtifacts: ['htmlWithoutJavaScript']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    let bodyHasContent = true;
    let debugString;
    if (artifacts.htmlWithoutJavaScript.trim() === '') {
      bodyHasContent = false;
      debugString = 'The page body should render some content if its scripts are not available.';
    }

    return WithoutJavaScript.generateAuditResult({
      value: bodyHasContent,
      debugString
    });
  }
}

module.exports = WithoutJavaScript;
