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

class ManifestBackgroundColor extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Manifest',
      name: 'manifest-background-color',
      description: 'Manifest contains background_color',
      requiredArtifacts: ['manifest']
    };
  }

  /**
   * @param {!Manifest=} manifest
   * @return {boolean}
   */
  static hasBackgroundColorValue(manifest) {
    return manifest !== undefined &&
      manifest.background_color !== undefined &&
      manifest.background_color.value !== undefined;
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const hasBackgroundColor = ManifestBackgroundColor
        .hasBackgroundColorValue(artifacts.manifest.value);

    return ManifestBackgroundColor.generateAuditResult({
      value: hasBackgroundColor
    });
  }
}

module.exports = ManifestBackgroundColor;
