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

const assetSaver = require('../lighthouse-core/lib/asset-saver.js');
const getFilenamePrefix = require('../lighthouse-core/lib/file-namer.js').getFilenamePrefix;
import {ChromeLauncher} from './chrome-launcher';
import * as Commands from './commands/commands';
const lighthouse = require('../lighthouse-core');
const log = require('../lighthouse-core/lib/log');
const Driver = require('../lighthouse-core/gather/driver.js');
import * as path from 'path';
const perfOnlyConfig = require('../lighthouse-core/config/perf.json');
const performanceXServer = require('./performance-experiment/server');
import * as Printer from './printer';
import * as randomPort from './random-port';
import {Results} from './types/types';
const yargs = require('yargs');
const pkg = require('../package.json');

// accept noop modules for these, so the real dependency is optional.
import {opn, updateNotifier} from './shim-modules';

updateNotifier({pkg}).notify(); // Tell user if there's a newer version of LH.

interface LighthouseError extends Error {
  code?: string
};

const cliFlags = yargs
  .help('help')
  .version(() => pkg.version)
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
    'additional-trace-categories',
    'config-path',
    'chrome-flags',
    'perf',
    'port',
    'max-wait-for-load'
  ], 'Configuration:')
  .describe({
    'disable-storage-reset': 'Disable clearing the browser cache and other storage APIs before a run',
    'disable-device-emulation': 'Disable Nexus 5X emulation',
    'disable-cpu-throttling': 'Disable CPU throttling',
    'disable-network-throttling': 'Disable network throttling',
    'save-assets': 'Save the trace contents & screenshots to disk',
    'save-artifacts': 'Save all gathered artifacts to disk',
    'list-all-audits': 'Prints a list of all available audits and exits',
    'list-trace-categories': 'Prints a list of all required trace categories and exits',
    'additional-trace-categories': 'Additional categories to capture with the trace (comma-delimited).',
    'config-path': 'The path to the config JSON.',
    'chrome-flags': 'Custom flags to pass to Chrome.',
    'perf': 'Use a performance-test-only configuration',
    'port': 'The port to use for the debugging protocol. Use 0 for a random port',
    'max-wait-for-load': 'The timeout (in milliseconds) to wait before the page is considered done loading and the run should continue. WARNING: Very high values can lead to large traces and instability',
    'skip-autolaunch': 'Skip autolaunch of Chrome when already running instance is not found',
    'select-chrome': 'Interactively choose version of Chrome to use when multiple installations are found',
    'interactive': 'Open Lighthouse in interactive mode'
  })

  .group([
    'output',
    'output-path',
    'view'
  ], 'Output:')
  .describe({
    'output': `Reporter for the results, supports multiple values`,
    'output-path': `The file path to output the results. Use 'stdout' to write to stdout.
If using JSON output, default is stdout.
If using HTML output, default is a file in the working directory with a name based on the test URL and date.
If using multiple outputs, --output-path is ignored.
Example: --output-path=./lighthouse-results.html`,
    'view': 'Open HTML report in your browser'
  })

  // boolean values
  .boolean([
    'disable-storage-reset',
    'disable-device-emulation',
    'disable-cpu-throttling',
    'disable-network-throttling',
    'save-assets',
    'save-artifacts',
    'list-all-audits',
    'list-trace-categories',
    'perf',
    'view',
    'skip-autolaunch',
    'select-chrome',
    'verbose',
    'quiet',
    'help',
    'interactive'
  ])
  .choices('output', Printer.GetValidOutputOptions())

  // default values
  .default('chrome-flags', '')
  .default('disable-cpu-throttling', false)
  .default('output', Printer.GetValidOutputOptions()[Printer.OutputMode.html])
  .default('port', 9222)
  .default('max-wait-for-load', Driver.MAX_WAIT_FOR_FULLY_LOADED)
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

if (cliFlags.output === Printer.OutputMode[Printer.OutputMode.json] && !cliFlags.outputPath) {
  cliFlags.outputPath = 'stdout';
}

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
function getDebuggableChrome(flags: {skipAutolaunch: boolean, port: number, selectChrome: boolean,
                               chromeFlags: string}): Promise<ChromeLauncher> {
  const chromeLauncher = new ChromeLauncher({
    port: flags.port,
    additionalFlags: flags.chromeFlags.split(' '),
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

function saveResults(results: Results,
                     artifacts: Object,
                     flags: {output: any, outputPath: string, saveArtifacts: boolean, saveAssets: boolean, view: boolean}) {
    let promise = Promise.resolve(results);
    const cwd = process.cwd();
    // Use the output path as the prefix for all generated files.
    // If no output path is set, generate a file prefix using the URL and date.
    const configuredPath = !flags.outputPath || flags.outputPath === 'stdout' ?
        getFilenamePrefix(results) : flags.outputPath.replace(/\.\w{2,4}$/, '');
    const resolvedPath = path.resolve(cwd, configuredPath);

    if (flags.saveArtifacts) {
      assetSaver.saveArtifacts(artifacts, resolvedPath);
    }

    if (flags.saveAssets) {
      promise = promise.then(_ => assetSaver.saveAssets(artifacts, results.audits, resolvedPath));
    }

    const typeToExtension = (type: string) => type === 'domhtml' ? 'dom.html' : type;
    return promise.then(_ => {
      if (Array.isArray(flags.output)) {
        return flags.output.reduce((innerPromise, outputType) => {
          const outputPath = `${resolvedPath}.report.${typeToExtension(outputType)}`;
          return innerPromise.then((_: Results) => Printer.write(results, outputType, outputPath));
        }, Promise.resolve(results));
      } else {
        const outputPath = flags.outputPath ||
            `${resolvedPath}.report.${typeToExtension(flags.output)}`;
        return Printer.write(results, flags.output, outputPath).then(results => {
          if (flags.output === Printer.OutputMode[Printer.OutputMode.html] ||
              flags.output === Printer.OutputMode[Printer.OutputMode.domhtml]) {
            if (flags.view) {
              opn(outputPath, {wait: false});
            } else {
              log.log('CLI', 'Protip: Run lighthouse with `--view` to immediately open the HTML report in your browser');
            }
          }

          return results;
        });
      }
    });
}

export async function runLighthouse(url: string,
                       flags: {port: number, skipAutolaunch: boolean, selectChrome: boolean, output: any,
                         outputPath: string, interactive: boolean, saveArtifacts: boolean, saveAssets: boolean
                         chromeFlags: string, maxWaitForLoad: number, view: boolean},
                       config: Object | null): Promise<{}|void> {

  let chromeLauncher: ChromeLauncher | undefined = undefined;

  try {
    await initPort(flags)
    const chromeLauncher = await getDebuggableChrome(flags)
    const results = await lighthouse(url, flags, config);

    const artifacts = results.artifacts;
    delete results.artifacts;

    await saveResults(results, artifacts!, flags);
    if (flags.interactive) {
      await performanceXServer.hostExperiment({url, flags, config}, results);
    }

    return await chromeLauncher.kill();
  } catch (err) {
    if (typeof chromeLauncher !== 'undefined') {
      await chromeLauncher!.kill();
    }

    return handleError(err);
  }
 }

export function run() {
  return runLighthouse(url, cliFlags, config);
}
