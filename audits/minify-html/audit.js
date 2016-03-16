/**
 * Copyright 2015 Google Inc. All rights reserved.
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

function getCompressionRatio(source) {
  var htmlNoWhiteSpaces = source
    .replace(/\n/igm, '')
    .replace(/\t/igm, '')
    .replace(/\s+/igm, ' ');

  var htmlLen = Math.max(1, source.length);
  var htmlNoWhiteSpacesLen = htmlNoWhiteSpaces.length;
  var ratio = Math.min(1, (htmlNoWhiteSpacesLen / htmlLen));

  return ratio;
}

function checkHtmlMinificationRatio(htmlSources) {
  // See how compressed the HTML _could_ be if whitespace was removed.
  // This could be a lot more aggressive.

  return Promise.resolve({
    htmlCompressionRatios: htmlSources.map(function(entity) {
      return {
        filename: entity.filename,
        compressionRatio: getCompressionRatio(entity.source)
      };
    })
  });
}

module.exports = function(data) {
  if (data.htmlSources === undefined) {
    throw new Error('minify html auditor requires html sources data');
  }

  return checkHtmlMinificationRatio(data.htmlSources);
};
