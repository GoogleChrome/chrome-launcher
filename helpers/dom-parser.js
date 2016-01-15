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

'use strict';

class DOMParser {

  /**
   * Parses the input string, either using Cheerio (Node) or using a DOMParser
   * (browser).
   * @param  {String} input The HTML to parse.
   * @return {Object} A selector engine.
   */
  static parse (input) {
    let output;
    if (typeof window === 'undefined') {
      // TODO(paullewis: change this to load dynamically to avoid
      // being transpiled in every time.
      let cheerio = require('cheerio');
      output = cheerio.load(input);
    } else {
      let parser = new window.DOMParser();
      output = parser.parseFromString(input);
    }

    return output;
  }
}

module.exports = DOMParser;
