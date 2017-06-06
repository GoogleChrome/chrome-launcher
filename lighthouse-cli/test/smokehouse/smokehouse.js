#!/usr/bin/env node
/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

const path = require('path');
const spawnSync = require('child_process').spawnSync;
const yargs = require('yargs');
const log = require('../../../lighthouse-core/lib/log');

const DEFAULT_CONFIG_PATH = 'pwa-config';
const DEFAULT_EXPECTATIONS_PATH = 'pwa-expectations';

const PROTOCOL_TIMEOUT_EXIT_CODE = 67;
const RETRIES = 3;
const NUMERICAL_EXPECTATION_REGEXP = /^(<=?|>=?)(\d+)$/;


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
 * @param {string=} saveAssetsPath
 * @return {!LighthouseResults}
 */
function runLighthouse(url, configPath, saveAssetsPath) {
  const command = 'node';
  const args = [
    'lighthouse-cli/index.js',
    url,
    `--config-path=${configPath}`,
    '--output=json',
    '--quiet',
    '--port=0'
  ];

  if (saveAssetsPath) {
    args.push('--save-assets');
    args.push(`--output-path=${saveAssetsPath}`);
  }

  // Lighthouse sometimes times out waiting to for a connection to Chrome in CI.
  // Watch for this error and retry relaunching Chrome and running Lighthouse up
  // to RETRIES times. See https://github.com/GoogleChrome/lighthouse/issues/833
  let runResults;
  let runCount = 0;
  do {
    if (runCount > 0) {
      console.log('  Lighthouse error: timed out waiting for debugger connection. Retrying...');
    }

    runCount++;
    console.log(`${log.dim}$ ${command} ${args.join(' ')} ${log.reset}`);
    runResults = spawnSync(command, args, {encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit']});
  } while (runResults.status === PROTOCOL_TIMEOUT_EXIT_CODE && runCount <= RETRIES);

  if (runResults.status === PROTOCOL_TIMEOUT_EXIT_CODE) {
    console.error(`Lighthouse debugger connection timed out ${RETRIES} times. Giving up.`);
    process.exit(1);
  } else if (runResults.status !== 0) {
    console.error(`Lighthouse run failed with exit code ${runResults.status}. stderr to follow:`);
    console.error(runResults.stderr);
    process.exit(runResults.status);
  }

  if (saveAssetsPath) {
    // If assets were saved, the JSON output was written to the specified path instead of stdout
    return require(resolveLocalOrCwd(saveAssetsPath));
  }

  return JSON.parse(runResults.stdout);
}

/**
 * Checks if the actual value matches the expectation. Does not recursively search. This supports
 *    - Greater than/less than operators, e.g. "<100", ">90"
 *    - Regular expressions
 *    - Strict equality
 *
 * @param {*} actual
 * @param {*} expected
 * @return {boolean}
 */
function matchesExpectation(actual, expected) {
  if (typeof actual === 'number' && NUMERICAL_EXPECTATION_REGEXP.test(expected)) {
    const parts = expected.match(NUMERICAL_EXPECTATION_REGEXP);
    const operator = parts[1];
    const number = parseInt(parts[2]);
    switch (operator) {
      case '>':
        return actual > number;
      case '>=':
        return actual >= number;
      case '<':
        return actual < number;
      case '<=':
        return actual <= number;
    }
  } else if (typeof actual === 'string' && expected instanceof RegExp && expected.test(actual)) {
    return true;
  } else {
    // Strict equality check, plus NaN equivalence.
    return Object.is(actual, expected);
  }
}

/**
 * Walk down expected result, comparing to actual result. If a difference is found,
 * the path to the difference is returned, along with the expected primitive value
 * and the value actually found at that location. If no difference is found, returns
 * null.
 *
 * Only checks own enumerable properties, not object prototypes, and will loop
 * until the stack is exhausted, so works best with simple objects (e.g. parsed JSON).
 * @param {string} path
 * @param {*} actual
 * @param {*} expected
 * @return {({path: string, actual: *, expected: *}|null)}
 */
function findDifference(path, actual, expected) {
  if (matchesExpectation(actual, expected)) {
    return null;
  }

  // If they aren't both an object we can't recurse further, so this is the difference.
  if (actual === null || expected === null || typeof actual !== 'object' ||
      typeof expected !== 'object' || expected instanceof RegExp) {
    return {
      path,
      actual,
      expected
    };
  }

  // We only care that all expected's own properties are on actual (and not the other way around).
  for (const key of Object.keys(expected)) {
    // Bracket numbers, but property names requiring quotes will still be unquoted.
    const keyAccessor = /^\d+$/.test(key) ? `[${key}]` : `.${key}`;
    const keyPath = path + keyAccessor;
    const expectedValue = expected[key];

    if (!(key in actual)) {
      return {keyPath, undefined, expectedValue};
    }

    const actualValue = actual[key];
    const subDifference = findDifference(keyPath, actualValue, expectedValue);

    // Break on first difference found.
    if (subDifference) {
      return subDifference;
    }
  }

  return null;
}

/**
 * Collate results into comparisons of actual and expected scores on each audit.
 * @param {{url: string, audits: !Array}} actual
 * @param {{url: string, audits: !Array}} expected
 * @return {{finalUrl: !Object, audits: !Array<!Object>}}
 */
function collateResults(actual, expected) {
  const auditNames = Object.keys(expected.audits);
  const collatedAudits = auditNames.map(auditName => {
    const actualResult = actual.audits[auditName];
    if (!actualResult) {
      throw new Error(`Config did not trigger run of expected audit ${auditName}`);
    }

    const expectedResult = expected.audits[auditName];
    const diff = findDifference(auditName, actualResult, expectedResult);

    return {
      category: auditName,
      actual: actualResult,
      expected: expectedResult,
      equal: !diff,
      diff
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
 * @param {{category: string, equal: boolean, diff: ?Object, actual: boolean, expected: boolean}} assertion
 */
function reportAssertion(assertion) {
  if (assertion.equal) {
    console.log(`  ${log.greenify(log.tick)} ${assertion.category}: ` +
        log.greenify(assertion.actual));
  } else {
    if (assertion.diff) {
      const diff = assertion.diff;
      let msg = `  ${log.redify(log.cross)} difference at ${diff.path}: `;
      msg += log.redify(`found ${diff.actual}, expected ${diff.expected}\n`);

      const fullActual = JSON.stringify(assertion.actual, null, 2).replace(/\n/g, '\n      ');
      msg += log.redify('      full found result: ' + fullActual);
      console.log(msg);
    } else {
      console.log(`  ${log.redify(log.cross)} ${assertion.category}: ` +
          log.redify(`found ${assertion.actual}, expected ${assertion.expected}`));
    }
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
  const colorFn = correctCount === 0 ? log.redify : log.greenify;
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
    'expectations-path': 'The path to the expected audit results file',
    'save-assets-path': 'Saves assets to the named path if set',
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
  const results = runLighthouse(expected.initialUrl, configPath, cli['save-assets-path']);
  const collated = collateResults(results, expected);
  const counts = report(collated);
  passingCount += counts.passed;
  failingCount += counts.failed;
});

if (passingCount) {
  console.log(log.greenify(`${passingCount} passing`));
}
if (failingCount) {
  console.log(log.redify(`${failingCount} failing`));
  process.exit(1);
}
