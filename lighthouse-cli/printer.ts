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

/**
 * An enumeration of acceptable output modes:
 *   'pretty': Pretty print the results
 *   'json': JSON formatted results
 *   'html': An HTML report
 */
enum OutputMode { pretty, json, html };
type Mode = 'pretty' | 'json' | 'html';

import {Results, AuditResult} from './types/types';

const fs = require('fs');
const ReportGenerator = require('../lighthouse-core/report/report-generator');
const Formatter = require('../lighthouse-core/formatters/formatter');
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

function formatAggregationResultItem(score: boolean | number | string, suffix?: string) {
  // Until we only support node 6 we can not use default args.
  suffix = suffix || '';

  const green = '\x1B[32m';
  const red = '\x1B[31m';
  const yellow = '\x1b[33m';
  const purple = '\x1b[95m';
  const reset = '\x1B[0m';

  if (typeof score === 'boolean') {
    const check = `${green}✓${reset}`;
    const fail = `${red}✘${reset}`;
    return score ? check : fail;
  }
  if (typeof score !== 'number') {
    return `${purple}${score}${reset}`;
  }

  let colorChoice = red;
  if (score > 45) {
    colorChoice = yellow;
  }
  if (score > 75) {
    colorChoice = green;
  }
  return `${colorChoice}${score}${suffix}${reset}`;
}

/**
 * Creates the results output in a format based on the `mode`.
 */
function createOutput(results: Results, outputMode: OutputMode): string {
  const reportGenerator = new ReportGenerator();

  // HTML report.
  if (outputMode === OutputMode.html) {
    return reportGenerator.generateHTML(results, 'cli');
  }

  // JSON report.
  if (outputMode === OutputMode.json) {
    return JSON.stringify(results, null, 2);
  }

  // Pretty printed.
  const bold = '\x1b[1m';
  const reset = '\x1B[0m';
  const version = results.lighthouseVersion;
  let output = `\n\n${bold}Lighthouse (${version}) results:${reset} ${results.url}\n\n`;

  results.aggregations.forEach(aggregation => {
    output += `▫ ${bold}${aggregation.name}${reset}\n\n`;

    aggregation.score.forEach(item => {
      const score = (item.overall * 100).toFixed(0);

      if (item.name) {
        output += `${bold}${item.name}${reset}: ${item.scored ? formatAggregationResultItem(score, '%') : ''}\n`;
      }

      item.subItems.forEach(subitem => {
        let auditResult: AuditResult;

        if (typeof subitem === 'string') {
          auditResult = (<any>results).audits[subitem];
        } else {
          auditResult = subitem as AuditResult;
        }

        if (auditResult.comingSoon === true)
          return;

        let lineItem = ` ── ${formatAggregationResultItem(auditResult.score)} ${auditResult.description}`;
        if (auditResult.displayValue) {
          lineItem += ` (${bold}${auditResult.displayValue}${reset})`;
        }
        output += `${lineItem}\n`;
        if (auditResult.debugString) {
          output += `    ${auditResult.debugString}\n`;
        }

        if (auditResult.extendedInfo && auditResult.extendedInfo.value) {
          const formatter =
              Formatter.getByName(auditResult.extendedInfo.formatter).getFormatter('pretty');
          output += `${formatter(auditResult.extendedInfo.value)}`;
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
 */
function writeToStdout(output: string): Promise<undefined> {
  return new Promise((resolve, reject) => {
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
function writeFile(filePath: string, output: string, outputMode: OutputMode): Promise<undefined> {
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

    return writeFile(outputPath, output, (<any>OutputMode)[mode]).then(_ => {
      resolve(results);
    }).catch(err => reject(err));
  });
}

function GetValidOutputOptions():Array<Mode> {
  return [OutputMode[OutputMode.pretty] as Mode,
          OutputMode[OutputMode.json] as Mode,
          OutputMode[OutputMode.html] as Mode];
}

export {
  checkOutputPath,
  createOutput,
  write,
  OutputMode,
  GetValidOutputOptions,
}
