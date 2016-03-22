/**
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

class ManifestThemeColor {

  static get tags() {
    return ['Manifest'];
  }

  static get description() {
    return 'Contains theme_color';
  }

  static audit(inputs) {
    let hasThemeColor = false;
    const manifest = inputs.manifest;

    if (manifest) {
      hasThemeColor = (!!manifest.theme_color.value);
    }

    return {
      value: hasThemeColor,
      tags: ManifestThemeColor.tags,
      description: ManifestThemeColor.description
    };
  }
}

module.exports = ManifestThemeColor;
