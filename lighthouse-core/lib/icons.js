/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @param {!Manifest=} manifest
 * @return {boolean} Does the manifest have any icons?
 */
function doExist(manifest) {
  if (!manifest || !manifest.icons) {
    return false;
  }
  if (manifest.icons.value.length === 0) {
    return false;
  }
  return true;
}

/**
 * @param {number} sizeRequirement
 * @param {!Manifest} manifest
 * @return {!Array<string>} Value of satisfactory sizes (eg. ['192x192', '256x256'])
 */
function sizeAtLeast(sizeRequirement, manifest) {
  // An icon can be provided for a single size, or for multiple sizes.
  // To handle both, we flatten all found sizes into a single array.
  const iconValues = manifest.icons.value;
  const nestedSizes = iconValues.map(icon => icon.value.sizes.value);
  const flattenedSizes = [].concat(...nestedSizes);

  return flattenedSizes
      // First, filter out any undefined values, in case an icon was defined without a size
      .filter(size => typeof size === 'string')
      // discard sizes that are not AAxBB (eg. "any")
      .filter(size => /\d+x\d+/.test(size))
      .filter(size => {
        // Split the '24x24' strings into ['24','24'] arrays
        const sizeStrs = size.split(/x/i);
        // Cast the ['24','24'] strings into [24,24] numbers
        const sizeNums = [parseFloat(sizeStrs[0]), parseFloat(sizeStrs[1])];
        // Only keep sizes that are as big as our required size
        const areIconsBigEnough = sizeNums[0] >= sizeRequirement && sizeNums[1] >= sizeRequirement;
        // Square is required: https://code.google.com/p/chromium/codesearch#chromium/src/chrome/browser/manifest/manifest_icon_selector.cc&q=ManifestIconSelector::IconSizesContainsBiggerThanMinimumSize&sq=package:chromium
        const areIconsSquare = sizeNums[0] === sizeNums[1];
        return areIconsBigEnough && areIconsSquare;
      });
}

module.exports = {
  doExist,
  sizeAtLeast
};
