/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const through = require('through2');

/**
 * This is a browserify transform that looks for requires to _interopRequireDefault(_fs)
 * and replaces them with require('fs'). This applies mainly to speedline, because of the
 * Babel transform that been through.
 */
module.exports = function() {
  const fileContents = [];
  return through(function(part, enc, next) {
    fileContents.push(part);
    next();
  }, function(done) {
    let fileContentsString = fileContents.join('');
    const fsRegExp = /_interopRequireDefault\(_fs\)/gim;
    const fsTimelineRegExp = /_fs2\.default\.readFileSync\(timeline, 'utf-8'\)/gim;
    const newPath = 'fs';

    if (fsRegExp.test(fileContentsString)) {
      fileContentsString = fileContentsString.replace(fsRegExp, `require("${newPath}")`);
    }

    if (fsTimelineRegExp.test(fileContentsString)) {
      fileContentsString = fileContentsString.replace(fsTimelineRegExp, 'timeline');
    }
    // eslint-disable-next-line no-invalid-this
    this.push(fileContentsString);
    done();
  });
};
