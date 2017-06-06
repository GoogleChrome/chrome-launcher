/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const _RUNTIME_ERROR_CODE = 1;
const _PROTOCOL_TIMEOUT_EXIT_CODE = 67;

const assetSaver = require('../lighthouse-core/lib/asset-saver.js');
const getFilenamePrefix = require('../lighthouse-core/lib/file-namer.js').getFilenamePrefix;
import {launch, LaunchedChrome} from '../chrome-launcher/chrome-launcher';
import * as Commands from './commands/commands';
import {getFlags, Flags} from './cli-flags';
const lighthouse = require('../lighthouse-core');
const log = require('../lighthouse-core/lib/log');
import * as path from 'path';
const perfOnlyConfig = require('../lighthouse-core/config/perf.json');
const performanceXServer = require('./performance-experiment/server');
import * as Printer from './printer';
import {Results} from './types/types';
const pkg = require('../package.json');

// accept noop modules for these, so the real dependency is optional.
import {opn, updateNotifier} from './shim-modules';

updateNotifier({pkg}).notify(); // Tell user if there's a newer version of LH.

interface LighthouseError extends Error {
  code?: string
}

const cliFlags = getFlags();

// Process terminating command
if (cliFlags.listAllAudits) {
  Commands.ListAudits();
}

// Process terminating command
if (cliFlags.listTraceCategories) {
  Commands.ListTraceCategories();
}

const url = cliFlags._[0];

let config: Object|null = null;
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
 * Attempts to connect to an instance of Chrome with an open remote-debugging
 * port. If none is found and the `skipAutolaunch` flag is not true, launches
 * a debuggable instance.
 */
async function getDebuggableChrome(flags: Flags) {
  return await launch({port: flags.port, chromeFlags: flags.chromeFlags.split(' ')});
}

function showConnectionError() {
  console.error('Unable to connect to Chrome');
  console.error(
      'If you\'re using lighthouse with --skip-autolaunch, ' +
      'make sure you\'re running some other Chrome with a debugger.');
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

function saveResults(results: Results, artifacts: Object, flags: Flags) {
  let promise = Promise.resolve(results);
  const cwd = process.cwd();
  // Use the output path as the prefix for all generated files.
  // If no output path is set, generate a file prefix using the URL and date.
  const configuredPath = !flags.outputPath || flags.outputPath === 'stdout' ?
      getFilenamePrefix(results) :
      flags.outputPath.replace(/\.\w{2,4}$/, '');
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
      const outputPath =
          flags.outputPath || `${resolvedPath}.report.${typeToExtension(flags.output)}`;
      return Printer.write(results, flags.output, outputPath).then(results => {
        if (flags.output === Printer.OutputMode[Printer.OutputMode.html] ||
            flags.output === Printer.OutputMode[Printer.OutputMode.domhtml]) {
          if (flags.view) {
            opn(outputPath, {wait: false});
          } else {
            log.log(
                'CLI',
                'Protip: Run lighthouse with `--view` to immediately open the HTML report in your browser');
          }
        }

        return results;
      });
    }
  });
}

export async function runLighthouse(
    url: string, flags: Flags, config: Object|null): Promise<{}|void> {
  let launchedChrome: LaunchedChrome|undefined;

  try {
    launchedChrome = await getDebuggableChrome(flags);
    flags.port = launchedChrome.port;
    const results = await lighthouse(url, flags, config);

    const artifacts = results.artifacts;
    delete results.artifacts;

    await saveResults(results, artifacts!, flags);
    if (flags.interactive) {
      await performanceXServer.hostExperiment({url, flags, config}, results);
    }

    return await launchedChrome.kill();
  } catch (err) {
    if (typeof launchedChrome !== 'undefined') {
      await launchedChrome!.kill();
    }

    return handleError(err);
  }
}

export function run() {
  return runLighthouse(url, cliFlags, config);
}
