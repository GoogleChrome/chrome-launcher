/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures `<video>` elements have audio descriptions.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class VideoDescription extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'video-description',
      description: '`<video>` elements contain a `<track>` element with `[kind="description"]`.',
      helpText: 'Audio descriptions provide relevant information for videos that dialogue ' +
          'cannot, such as facial expressions and scenes. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/1.1/video-description).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = VideoDescription;
