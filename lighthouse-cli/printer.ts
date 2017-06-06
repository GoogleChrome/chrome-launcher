/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * An enumeration of acceptable output modes:
 *   'json': JSON formatted results
 *   'html': An HTML report
 *   'domhtml': An HTML report rendered client-side with DOM elements
 */
enum OutputMode {
  json,
  html,
  domhtml
}
;
type Mode = 'json'|'html'|'domhtml';

import {Results} from './types/types';

const fs = require('fs');
const ReportGeneratorV2 = require('../lighthouse-core/report/v2/report-generator');
const log = require('../lighthouse-core/lib/log');


/**
 * Verify output path to use, either stdout or a file path.
 */
function checkOutputPath(path: string): string {
  if (!path) {
    log.warn('Printer', 'No output path set; using stdout');
    return 'stdout';
  }

  return path;
}

/**
 * Creates the results output in a format based on the `mode`.
 */
function createOutput(results: Results, outputMode: OutputMode): string {
  // HTML report.
  if (outputMode === OutputMode.domhtml || outputMode === OutputMode.html) {
    return new ReportGeneratorV2().generateReportHtml(results);
  }

  // JSON report.
  if (outputMode === OutputMode.json) {
    return JSON.stringify(results, null, 2);
  }

  throw new Error('Invalid output mode: ' + outputMode);
}

/* istanbul ignore next */
/**
 * Writes the output to stdout.
 */
function writeToStdout(output: string): Promise<{}> {
  return new Promise(resolve => {
    // small delay to avoid race with debug() logs
    setTimeout(_ => {
      process.stdout.write(`${output}\n`);
      resolve();
    }, 50);
  });
}

/**
 * Writes the output to a file.
 */
function writeFile(filePath: string, output: string, outputMode: OutputMode): Promise<{}> {
  return new Promise((resolve, reject) => {
    // TODO: make this mkdir to the filePath.
    fs.writeFile(filePath, output, 'utf8', (err: Error) => {
      if (err) {
        return reject(err);
      }
      log.log('Printer', `${OutputMode[outputMode]} output written to ${filePath}`);
      resolve();
    });
  });
}

/**
 * Writes the results.
 */
function write(results: Results, mode: Mode, path: string): Promise<Results> {
  return new Promise((resolve, reject) => {
    const outputPath = checkOutputPath(path);

    const output = createOutput(results, (<any>OutputMode)[mode]);

    // Testing stdout is out of scope, and doesn't really achieve much besides testing Node,
    // so we will skip this chunk of the code.
    /* istanbul ignore if */
    if (outputPath === 'stdout') {
      return writeToStdout(output).then(_ => resolve(results));
    }

    return writeFile(outputPath, output, (<any>OutputMode)[mode])
        .then(_ => {
          resolve(results);
        })
        .catch(err => reject(err));
  });
}

function GetValidOutputOptions(): Array<Mode> {
  return [
    OutputMode[OutputMode.json] as Mode, OutputMode[OutputMode.html] as Mode,
    OutputMode[OutputMode.domhtml] as Mode
  ];
}

export {
  checkOutputPath,
  createOutput,
  write,
  OutputMode,
  GetValidOutputOptions,
}
