#!/usr/bin/env node
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

const path = require('path');
const execSync = require('child_process').execSync;
const yargs = require('yargs');

const DEFAULT_CONFIG_PATH = 'pwa-config';
const DEFAULT_EXPECTATIONS_PATH = 'pwa-expectations';

const GREEN = '\x1B[32m';
const RED = '\x1B[31m';
const RESET = '\x1B[0m';
const GREEN_CHECK = greenify('✓');
const RED_X = redify('✘');

/**
 * Add surrounding escape sequences to turn a string green when logged.
 * @param {string} str
 * @return {string}
 */
function greenify(str) {
  return `${GREEN}${str}${RESET}`;
}

/**
 * Add surrounding escape sequences to turn a string red when logged.
 * @param {string} str
 * @return {string}
 */
function redify(str) {
  return `${RED}${str}${RESET}`;
}

/**
 * Attempt to resolve a path locally. If this fails, attempts to locate the path
 * relative to the current working directory.
 * @param {string} payloadPath
 * @return {string}
 */
function resolveLocalOrCwd(payloadPath) {
  let resolved;
  try {
    resolved = require.resolve('./' + payloadPath);
  } catch (e) {
    const cwdPath = path.resolve(process.cwd(), payloadPath);
    resolved = require.resolve(cwdPath);
  }

  return resolved;
}

/**
 * Launch Chrome and do a full Lighthouse run.
 * @param {string} url
 * @param {string} configPath
 * @return {!LighthouseResults}
 */
function runLighthouse(url, configPath) {
  // Assume if currently running in Node v4 that child process will as well, so
  // run Lighthouse with --harmony flag.
  const harmony = /v4/.test(process.version) ? '--harmony' : '';
  const command = `node ${harmony} lighthouse-cli/index.js ${url}`;
  const options = [
    `--config-path=${configPath}`,
    '--output=json',
    '--quiet'
  ].join(' ');

  const rawResults = execSync(command + ' ' + options, {encoding: 'utf8'});
  return JSON.parse(rawResults);
}

/**
 * Collate results into comparisons of actual and expected scores on each audit.
 * @param {{url: string, audits: {score: boolean}}} actual
 * @param {{url: string, audits: boolean}} expected
 * @return {{finalUrl: !Object, audits: !Array<!Object>}}
 */
function collateResults(actual, expected) {
  const auditNames = Object.keys(expected.audits);
  const collatedAudits = auditNames.map(auditName => {
    const actualResult = actual.audits[auditName];
    if (!actualResult) {
      throw new Error(`Config did not trigger run of expected audit ${auditName}`);
    }

    const actualScore = actualResult.score;
    const expectedScore = expected.audits[auditName];
    return {
      category: auditName,
      actual: actualScore,
      expected: expectedScore,
      equal: actualScore === expectedScore
    };
  });

  return {
    finalUrl: {
      category: 'final url',
      actual: actual.url,
      expected: expected.url,
      equal: actual.url === expected.url
    },
    audits: collatedAudits
  };
}

/**
 * Log the result of an assertion of actual and expected results.
 * @param {{category: string, equal: boolean, actual: boolean, expected: boolean}} assertion
 */
function reportAssertion(assertion) {
  if (assertion.equal) {
    console.log(`  ${GREEN_CHECK} ${assertion.category}: ` +
        greenify(assertion.actual));
  } else {
    console.log(`  ${RED_X} ${assertion.category}: ` +
        redify(`found ${assertion.actual}, expected ${assertion.expected}`));
  }
}

/**
 * Log all the comparisons between actual and expected test results, then print
 * summary. Returns count of passed and failed tests.
 * @param {{finalUrl: !Object, audits: !Array<!Object>}} results
 * @return {{passed: number, failed: number}}
 */
function report(results) {
  reportAssertion(results.finalUrl);

  let correctCount = 0;
  let failedCount = 0;
  results.audits.forEach(auditAssertion => {
    if (auditAssertion.equal) {
      correctCount++;
    } else {
      failedCount++;
      reportAssertion(auditAssertion);
    }
  });

  const plural = correctCount === 1 ? '' : 's';
  const correctStr = `${correctCount} audit${plural}`;
  const colorFn = correctCount === 0 ? redify : greenify;
  console.log(`  Correctly passed ${colorFn(correctStr)}\n`);

  return {
    passed: correctCount,
    failed: failedCount
  };
}

const cli = yargs
  .help('help')
  .describe({
    'config-path': 'The path to the config JSON file',
    'expectations-path': 'The path to the expected audit results file'
  })
  .default('config-path', DEFAULT_CONFIG_PATH)
  .default('expectations-path', DEFAULT_EXPECTATIONS_PATH)
  .argv;

const configPath = resolveLocalOrCwd(cli['config-path']);
const expectations = require(resolveLocalOrCwd(cli['expectations-path']));

// Loop sequentially over expectations, comparing against Lighthouse run, and
// reporting result.
let passingCount = 0;
let failingCount = 0;
expectations.forEach(expected => {
  console.log(`Checking '${expected.initialUrl}'...`);
  const results = runLighthouse(expected.initialUrl, configPath);
  const collated = collateResults(results, expected);
  const counts = report(collated);
  passingCount += counts.passed;
  failingCount += counts.failed;
});

if (passingCount) {
  console.log(greenify(`${passingCount} passing`));
}
if (failingCount) {
  console.log(redify(`${failingCount} failing`));
  process.exit(1);
}
