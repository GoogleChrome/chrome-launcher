/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const through = require('through2');
const path = require('path');

/**
 * This is a browserify transform that looks for requires to devtools-timeline-model
 * and replaces them for the local version in Lighthouse. This is just for the extension
 * since by default it doesn't browserify properly.
 */
module.exports = function() {
  const fileContents = [];
  return through(function(part, enc, next) {
    fileContents.push(part);
    next();
  }, function(done) {
    let fileContentsString = fileContents.join('');
    const dtmRegExp = /require\(['"]devtools-timeline-model['"]\)/gim;
    const newPath = path.join(__dirname, '../',
        'lighthouse-core/lib/traces/devtools-timeline-model');

    if (dtmRegExp.test(fileContentsString)) {
      fileContentsString = fileContentsString.replace(dtmRegExp, `require("${newPath}")`);
    }

    // eslint-disable-next-line no-invalid-this
    this.push(fileContentsString);
    done();
  });
};
