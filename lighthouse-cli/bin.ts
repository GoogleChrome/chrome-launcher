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

const _SIGINT = 'SIGINT';
const _SIGINT_EXIT_CODE = 130;
const _RUNTIME_ERROR_CODE = 1;
const _PROTOCOL_TIMEOUT_EXIT_CODE = 67;

const environment = require('../lighthouse-core/lib/environment.js');
if (!environment.checkNodeCompatibility()) {
  console.warn('Compatibility error', 'Lighthouse requires node 5+ or 4 with --harmony');
  process.exit(_RUNTIME_ERROR_CODE);
}

const assetSaver = require('../lighthouse-core/lib/asset-saver.js');
import {ChromeLauncher} from './chrome-launcher';
import * as Commands from './commands/commands';
const lighthouse = require('../lighthouse-core');
const log = require('../lighthouse-core/lib/log');
import * as path from 'path';
const perfOnlyConfig = require('../lighthouse-core/config/perf.json');
const performanceXServer = require('./performance-experiment/server');
import * as Printer from './printer';
import * as randomPort from './random-port';
import {Results} from './types/types';
const yargs = require('yargs');

interface LighthouseError extends Error {
  code?: string
};

const cliFlags = yargs
  .help('help')
  .version(() => require('../package').version)
  .showHelpOnFail(false, 'Specify --help for available options')

  .usage('$0 url')

  // List of options
  .group([
    'verbose',
    'quiet'
  ], 'Logging:')
  .describe({
    verbose: 'Displays verbose logging',
    quiet: 'Displays no progress, debug logs or errors'
  })

  .group([
    'save-assets',
    'save-artifacts',
    'list-all-audits',
    'list-trace-categories',
    'config-path',
    'perf',
    'port'
  ], 'Configuration:')
  .describe({
    'disable-device-emulation': 'Disable Nexus 5X emulation',
    'disable-cpu-throttling': 'Disable CPU throttling',
    'disable-network-throttling': 'Disable network throttling',
    'save-assets': 'Save the trace contents & screenshots to disk',
    'save-artifacts': 'Save all gathered artifacts to disk',
    'list-all-audits': 'Prints a list of all available audits and exits',
    'list-trace-categories': 'Prints a list of all required trace categories and exits',
    'config-path': 'The path to the config JSON.',
    'perf': 'Use a performance-test-only configuration',
    'port': 'The port to use for the debugging protocol. Use 0 for a random port',
    'skip-autolaunch': 'Skip autolaunch of Chrome when already running instance is not found',
    'select-chrome': 'Interactively choose version of Chrome to use when multiple installations are found',
    'interactive': 'Open Lighthouse in interactive mode'
  })

  .group([
    'output',
    'output-path'
  ], 'Output:')
  .describe({
    'output': 'Reporter for the results',
    'output-path': `The file path to output the results
Example: --output-path=./lighthouse-results.html`
  })

  // boolean values
  .boolean([
    'disable-device-emulation',
    'disable-cpu-throttling',
    'disable-network-throttling',
    'save-assets',
    'save-artifacts',
    'list-all-audits',
    'list-trace-categories',
    'perf',
    'skip-autolaunch',
    'select-chrome',
    'verbose',
    'quiet',
    'help',
    'interactive'
  ])
  .choices('output', Printer.GetValidOutputOptions())

  // default values
  .default('disable-cpu-throttling', true)
  .default('output', Printer.GetValidOutputOptions()[Printer.OutputMode.pretty])
  .default('output-path', 'stdout')
  .default('port', 9222)
  .check((argv: {listAllAudits?: boolean, listTraceCategories?: boolean, _: Array<any>}) => {
    // Make sure lighthouse has been passed a url, or at least one of --list-all-audits
    // or --list-trace-categories. If not, stop the program and ask for a url
    if (!argv.listAllAudits && !argv.listTraceCategories && argv._.length === 0) {
      throw new Error('Please provide a url');
    }

    return true;
  })
  .argv;

// Process terminating command
if (cliFlags.listAllAudits) {
  Commands.ListAudits();
}

// Process terminating command
if (cliFlags.listTraceCategories) {
  Commands.ListTraceCategories();
}

const url = cliFlags._[0];

// Work around camelCase bug for default value in yargs 3.30.
// see: https://github.com/yargs/yargs/issues/341
if (!cliFlags.outputPath && cliFlags['output-path']) {
  cliFlags.outputPath = cliFlags['output-path'];
}

let config: Object | null = null;
if (cliFlags.configPath) {
  // Resolve the config file path relative to where cli was called.
  cliFlags.configPath = path.resolve(process.cwd(), cliFlags.configPath);
  config = require(cliFlags.configPath);
} else if (cliFlags.perf) {
  config = perfOnlyConfig;
}

// set logging preferences
cliFlags.logLevel = 'info';
if (cliFlags.verbose) {
  cliFlags.logLevel = 'verbose';
} else if (cliFlags.quiet) {
  cliFlags.logLevel = 'silent';
}
log.setLevel(cliFlags.logLevel);

/**
 * If the requested port is 0, set it to a random, unused port.
 */
function initPort(flags: {port: number}): Promise<undefined> {
  return Promise.resolve().then(() => {
    if (flags.port !== 0) {
      log.verbose('Lighthouse CLI', `Using supplied port ${flags.port}`);
      return;
    }

    log.verbose('Lighthouse CLI', 'Generating random port.');
    return randomPort.getRandomPort().then(portNumber => {
      flags.port = portNumber;
      log.verbose('Lighthouse CLI', `Using generated port ${flags.port}.`);
    });
  })
}

/**
 * Attempts to connect to an instance of Chrome with an open remote-debugging
 * port. If none is found and the `skipAutolaunch` flag is not true, launches
 * a debuggable instance.
 */
function getDebuggableChrome(flags: {skipAutolaunch: boolean, port: number, selectChrome: boolean}): Promise<ChromeLauncher> {
  const chromeLauncher = new ChromeLauncher({
    port: flags.port,
    autoSelectChrome: !flags.selectChrome,
  });

  // Kill spawned Chrome process in case of ctrl-C.
  process.on(_SIGINT, () => {
    chromeLauncher.kill().then(() => process.exit(_SIGINT_EXIT_CODE), handleError);
  });

  return chromeLauncher
    // Check if there is an existing instance of Chrome ready to talk.
    .isDebuggerReady()
    .catch(() => {
      if (flags.skipAutolaunch) {
        return;
      }

      // If not, create one.
      log.log('Lighthouse CLI', 'Launching Chrome...');
      return chromeLauncher.run();
    })
    .then(() => chromeLauncher);
}

function showConnectionError() {
  console.error('Unable to connect to Chrome');
  console.error(
    'If you\'re using lighthouse with --skip-autolaunch, ' +
    'make sure you\'re running some other Chrome with a debugger.'
  );
  process.exit(_RUNTIME_ERROR_CODE);
}

function showRuntimeError(err: LighthouseError) {
  console.error('Runtime error encountered:', err);
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(_RUNTIME_ERROR_CODE);
}

function showProtocolTimeoutError() {
  console.error('Debugger protocol timed out while connecting to Chrome.');
  process.exit(_PROTOCOL_TIMEOUT_EXIT_CODE);
}

function showPageLoadError() {
  console.error('Unable to load the page. Please verify the url you are trying to review.');
  process.exit(_RUNTIME_ERROR_CODE);
}

function handleError(err: LighthouseError) {
  if (err.code === 'PAGE_LOAD_ERROR') {
    showPageLoadError();
  } else if (err.code === 'ECONNREFUSED') {
    showConnectionError();
  } else if (err.code === 'CRI_TIMEOUT') {
    showProtocolTimeoutError();
  } else {
    showRuntimeError(err);
  }
}

function runLighthouse(url: string,
                       flags: {port: number, skipAutolaunch: boolean, selectChrome: boolean, output: any,
                         outputPath: string, interactive: boolean, saveArtifacts: boolean, saveAssets: boolean},
                       config: Object): Promise<undefined> {

  let chromeLauncher: ChromeLauncher;
  return initPort(flags)
    .then(() => getDebuggableChrome(flags))
    .then(chrome => chromeLauncher = chrome)
    .then(() => lighthouse(url, flags, config))
    .then((results: Results) => {
      // delete artifacts from result so reports won't include artifacts.
      const artifacts = results.artifacts;
      results.artifacts = undefined;

      if (flags.saveArtifacts) {
        assetSaver.saveArtifacts(artifacts);
      }
      if (flags.saveAssets) {
        return assetSaver.saveAssets(artifacts, results).then(() => results);
      }
      return results;
    })
    .then((results: Results) => Printer.write(results, flags.output, flags.outputPath))
    .then((results: Results) => {
      if (flags.output === Printer.OutputMode[Printer.OutputMode.pretty]) {
        const filename = `${assetSaver.getFilenamePrefix(results)}.report.html`;
        return Printer.write(results, 'html', filename);
      }
      return results;
    })
    .then((results: Results) => {
      if (flags.interactive) {
        return performanceXServer.hostExperiment({url, flags, config}, results);
      }
    })
    .then(() => chromeLauncher.kill())
    .catch(err => {
      return chromeLauncher.kill().then(() => handleError(err), handleError);
    });
}

function run() {
  return runLighthouse(url, cliFlags, config);
}

export {
  runLighthouse,
  run
}
