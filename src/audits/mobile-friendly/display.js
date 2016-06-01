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

class ManifestDisplay extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Manifest',
      name: 'manifest-display',
      description: 'Manifest\'s display property set to standalone/fullscreen to ' +
            'allow launching without address bar',
      requiredArtifacts: ['manifest']
    };
  }

  /**
   * @param {string|null} val
   * @return {boolean}
   */
  static hasRecommendedValue(val) {
    return (val === 'fullscreen' || val === 'standalone');
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const manifest = artifacts.manifest.value;
    const displayValue = (!manifest || !manifest.display) ? undefined : manifest.display.value;

    const hasRecommendedValue = ManifestDisplay.hasRecommendedValue(displayValue);

    return ManifestDisplay.generateAuditResult({
      value: hasRecommendedValue,
      rawValue: displayValue,
      debugString: 'Manifest display property should be standalone or fullscreen.'
    });
  }
}

module.exports = ManifestDisplay;
