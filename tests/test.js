'use strict';

class Test {

  /**
   * Parses the input string, either using Cheerio (Node) or using a DOMParser
   * (browser).
   * @param  {String} input The HTML to parse.
   * @return {Object} A selector engine.
   */
  parse (input) {
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

module.exports = Test;
