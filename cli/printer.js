'use strict';

const Printer = {
  /**
   * @param {{info: function(...)}} debugLog
   * @param {{log: function(...)}} output
   * @param {string} url
   * @param {!Array<?>} results
   */
  json: function(debugLog, output, url, results) {
    debugLog.info('\n\n\nLighthouse results (JSON):', url);

    output.log(JSON.stringify(results, null, 2));
  },

  /**
   * @param {{info: function(...)}} debugLog
   * @param {string} url
   * @param {{log: function(...)}} output
   * @param {!Array<?>} results
   */
  prettyPrint: function(debugLog, output, url, results) {
    debugLog.info('\n\n\nLighthouse results:', url);

    // TODO: colorise
    results.forEach(item => {
      let score = (item.score.overall * 100).toFixed(0);
      output.log(`${item.name}: ${score}%`);

      item.score.subItems.forEach(subitem => {
        let lineItem = ` -- ${subitem.description}: ${subitem.value}`;
        if (subitem.rawValue) {
          lineItem += ` (${subitem.rawValue})`;
        }
        output.log(lineItem);
        if (subitem.debugString) {
          output.log(`    ${subitem.debugString}`);
        }
      });

      output.log('');
    });
  }
};

module.exports = Printer;
