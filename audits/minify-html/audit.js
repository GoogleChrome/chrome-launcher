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

module.exports = function(data) {
  // See how compressed the HTML _could_ be if whitespace was removed.
  // This could be a lot more aggressive.
  let htmlNoWhiteSpaces = data.html
    .replace(/\n/igm, '')
    .replace(/\t/igm, '')
    .replace(/\s+/igm, ' ');

  let htmlLen = Math.max(1, data.html.length);
  let htmlNoWhiteSpacesLen = htmlNoWhiteSpaces.length;
  let ratio = Math.min(1, (htmlNoWhiteSpacesLen / htmlLen));

  return {
    'minify-html': ratio
  };
};
