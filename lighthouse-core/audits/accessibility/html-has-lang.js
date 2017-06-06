/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures every HTML document has a `lang` attribute.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class HTMLHasLang extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'html-has-lang',
      description: '`<html>` element has a `[lang]` attribute.',
      helpText: 'If a page doesn\'t specify a lang attribute, a screen reader assumes ' +
          'that the page is in the default language that the user chose when setting up the ' +
          'screen reader. If the page isn\'t actually in the default language, then the screen ' +
          'reader might not announce the page\'s text correctly. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/1.1/html-lang).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = HTMLHasLang;
