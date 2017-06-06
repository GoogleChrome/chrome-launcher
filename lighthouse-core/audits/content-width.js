/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');

class ContentWidth extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Mobile Friendly',
      name: 'content-width',
      description: 'Content is sized correctly for the viewport',
      helpText: 'If the width of your app\'s content doesn\'t match the width ' +
          'of the viewport, your app might not be optimized for mobile screens. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/content-sized-correctly-for-viewport).',
      requiredArtifacts: ['ViewportDimensions']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const viewportWidth = artifacts.ViewportDimensions.innerWidth;
    const windowWidth = artifacts.ViewportDimensions.outerWidth;
    const widthsMatch = viewportWidth === windowWidth;

    return {
      rawValue: widthsMatch,
      debugString: this.createDebugString(widthsMatch, artifacts.ViewportDimensions)
    };
  }

  static createDebugString(match, artifact) {
    if (match) {
      return '';
    }

    return 'The viewport size is ' + artifact.innerWidth + 'px, ' +
        'whereas the window size is ' + artifact.outerWidth + 'px.';
  }
}

module.exports = ContentWidth;
