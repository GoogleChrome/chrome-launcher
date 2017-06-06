/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures `<audio>` elements have captions.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class AudioCaption extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'audio-caption',
      description: '`<audio>` elements contain a `<track>` element with `[kind="captions"]`.',
      helpText: 'Captions make audio elements usable for deaf or hearing-impaired users, ' +
          'providing critical information such as who is talking, what they\'re saying, ' +
          'and other non-speech information. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/1.1/audio-caption).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = AudioCaption;
