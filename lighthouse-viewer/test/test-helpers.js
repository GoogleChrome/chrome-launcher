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

const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');

/* eslint-env mocha */

const PAGE = fs.readFileSync(path.join(__dirname, '../app/index.html'), 'utf8');

function setupJsDomGlobals() {
  global.document = jsdom.jsdom(PAGE);
  global.window = global.document.defaultView;
}

function cleanupJsDomGlobals() {
  global.document = undefined;
  global.window = undefined;
}

module.exports = {
  setupJsDomGlobals,
  cleanupJsDomGlobals
};
