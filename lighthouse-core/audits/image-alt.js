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

/**
 * @fileoverview Ensures <img> elements have alternate text or a role of none or presentation.
 */

const Audit = require('./audit');
const A11yHelpers = require('../lib/a11y-helpers');
const Formatter = require('../formatters/formatter');

class ImageAlt extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'image-alt',
      description: 'Every image element has an alt attribute',
      requiredArtifacts: ['Accessibility']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const violations = artifacts.Accessibility.violations || [];
    const rule = violations.find(result => result.id === 'image-alt');

    return ImageAlt.generateAuditResult({
      rawValue: typeof rule === 'undefined',
      debugString: A11yHelpers.createDebugString(rule),
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.ACCESSIBILITY,
        value: rule
      }
    });
  }
}

module.exports = ImageAlt;
