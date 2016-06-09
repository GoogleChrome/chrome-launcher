/**
 * @license
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
const ReportGenerator = require('../report/report-generator');
const Formatter = require('../formatters/formatter');

const log = require('../src/lib/log.js');

/**
 * An enumeration of acceptable output modes:
 * <ul>
 *   <li>'pretty': Pretty print the results</li>
 *   <li>'json': JSON formatted results</li>
 *   <li>'html': An HTML report</li>
 * </ul>
 * @enum {string}
 */
const OUTPUT_MODE = {
  pretty: 'pretty',
  json: 'json',
  html: 'html'
};

/**
 * Verify output mode.
 * @param {string} mode
 * @return {OUTPUT_MODE}
 */
function checkOutputMode(mode) {
  if (!OUTPUT_MODE.hasOwnProperty(mode)) {
    log.log('warn', `Unknown output mode ${mode}; using pretty`);
    return OUTPUT_MODE.pretty;
  }

  return OUTPUT_MODE[mode];
}

/**
 * Verify output path to use, either stdout or a file path.
 * @param {string} path
 */
function checkOutputPath(path) {
  if (!path) {
    log.log('warn', 'No output path set; using stdout');
    return 'stdout';
  }

  return path;
}

/**
 * Creates the results output in a format based on the `mode`.
 *
 * @param {{url: string, aggregations: !Array<*>}} results
 * @param {OUTPUT_MODE} outputMode
 * @return {string}
 */
function createOutput(results, outputMode) {
  const reportGenerator = new ReportGenerator();

  // HTML report.
  if (outputMode === 'html') {
    return reportGenerator.generateHTML(results, {inline: true});
  }

  // JSON report.
  if (outputMode === 'json') {
    return JSON.stringify(results.aggregations, null, 2);
  }

  // Pretty printed.
  let output = `Lighthouse results: ${results.url}\n\n`;

  results.aggregations.forEach(aggregation => {
    output += `Name: ${aggregation.name}\n`;
    output += `Description: ${aggregation.description}\n\n`;

    aggregation.score.forEach(item => {
      let score = (item.overall * 100).toFixed(0);

      if (item.name) {
        output += `${item.name}: ${score}%\n`;
      }

      item.subItems.forEach(subitem => {
        let lineItem = ` -- ${subitem.description}: ${subitem.value}`;
        if (typeof subitem.rawValue !== 'undefined') {
          lineItem += ` (${subitem.rawValue})`;
        }
        output += `${lineItem}\n`;
        if (subitem.debugString) {
          output += `    ${subitem.debugString}\n`;
        }

        if (subitem.extendedInfo && subitem.extendedInfo.value) {
          const formatter =
              Formatter.getByName(subitem.extendedInfo.formatter).getFormatter('pretty');
          output += `${formatter(subitem.extendedInfo.value)}`;
        }
      });

      output += '\n';
    });
  });

  return output;
}

/* istanbul ignore next */
/**
 * Writes the output to stdout.
 *
 * @param {string} output
 * @return {!Promise}
 */
function writeToStdout(output) {
  return Promise.resolve(process.stdout.write(`${output}\n`));
}

/**
 * Writes the output to a file.
 *
 * @param {string} filePath The destination path
 * @param {string} output The output to write
 * @param {string} outputMode Output mode; either 'pretty', 'json', or 'html'.
 * @return {Promise}
 */
function writeFile(filePath, output, outputMode) {
  return new Promise((resolve, reject) => {
    // TODO: make this mkdir to the filePath.
    fs.writeFile(filePath, output, 'utf8', err => {
      if (err) {
        return reject(err);
      }
      log.info('printer', `${outputMode} output written to ${filePath}`);
      resolve();
    });
  });
}

/**
 * Writes the results.
 *
 * @param {{url: string, aggregations: !Array<*>}} results
 * @param {string} mode Output mode; either 'pretty', 'json', or 'html'.
 * @param {string} path The output path to use, either stdout or a file path.
 * @return {!Promise}
 */
function write(results, mode, path) {
  return new Promise((resolve, reject) => {
    const outputMode = checkOutputMode(mode);
    const outputPath = checkOutputPath(path);

    const output = createOutput(results, outputMode);

    // Testing stdout is out of scope, and doesn't really achieve much besides testing Node,
    // so we will skip this chunk of the code.
    /* istanbul ignore if */
    if (outputPath === 'stdout') {
      return writeToStdout(output).then(_ => resolve(results));
    }

    return writeFile(outputPath, output, outputMode).then(_ => {
      resolve(results);
    }).catch(err => reject(err));
  });
}

module.exports = {
  checkOutputMode,
  checkOutputPath,
  createOutput,
  write,
  OUTPUT_MODE
};
