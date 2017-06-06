/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures `<meta name="viewport">` does not disable text scaling and zooming.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class MetaViewport extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'meta-viewport',
      description: '`[user-scalable="no"]` is not used in the `<meta name="viewport">` ' +
          'element and the `[maximum-scale]` attribute is not less than 5.',
      helpText: 'Disabling zooming is problematic for users with low vision who rely on screen ' +
          'magnification to properly see the contents of a web page. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/1.1/meta-viewport).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = MetaViewport;
