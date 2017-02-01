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
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class ImageAlt extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'image-alt',
      description: 'Every image element has an alt attribute',
      helpText: 'Screen reader users rely on `alt` text to provide descriptions of ' +
          'images. It\'s also used as fallback content when an image fails to load. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/alt-attribute).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = ImageAlt;
