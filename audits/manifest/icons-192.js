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

const manifestParser = require('../../helpers/manifest-parser');

class ManifestIcons192 {

  static get tags() {
    return ['Manifest'];
  }

  static get description() {
    return 'Contains 192px icons';
  }

  static audit(inputs) {
    let hasIcons = false;
    const manifest = manifestParser(inputs.manifest).value;

    if (manifest && manifest.icons) {
      const icons192 = manifest.icons.raw.find(function(i) {
        return i.sizes === '192x192';
      });
      hasIcons = (!!icons192);
    }

    return {
      value: hasIcons,
      tags: ManifestIcons192.tags,
      description: ManifestIcons192.description
    };
  }
}

module.exports = ManifestIcons192;
