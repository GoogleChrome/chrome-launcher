/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Parser = require('metaviewport-parser');

class Viewport extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Mobile Friendly',
      name: 'viewport',
      description: 'Has a `<meta name="viewport">` tag with `width` or `initial-scale`',
      helpText: 'Add a viewport meta tag to optimize your app for mobile screens. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/has-viewport-meta-tag).',
      requiredArtifacts: ['Viewport']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (artifacts.Viewport === null) {
      return {
        debugString: 'No viewport meta tag found',
        rawValue: false
      };
    }

    let debugString = '';
    const parsedProps = Parser.parseMetaViewPortContent(artifacts.Viewport);

    if (Object.keys(parsedProps.unknownProperties).length) {
      debugString += `Invalid properties found: ${JSON.stringify(parsedProps.unknownProperties)}. `;
    }
    if (Object.keys(parsedProps.invalidValues).length) {
      debugString += `Invalid values found: ${JSON.stringify(parsedProps.invalidValues)}. `;
    }
    debugString = debugString.trim();

    const viewportProps = parsedProps.validProperties;
    const hasMobileViewport = viewportProps.width || viewportProps['initial-scale'];

    return {
      rawValue: !!hasMobileViewport,
      debugString
    };
  }
}

module.exports = Viewport;
