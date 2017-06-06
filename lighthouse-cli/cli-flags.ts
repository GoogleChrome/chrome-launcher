/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const yargs = require('yargs');
const pkg = require('../package.json');
const Driver = require('../lighthouse-core/gather/driver.js');

import {GetValidOutputOptions, OutputMode} from './printer';

export interface Flags {
  skipAutolaunch: boolean, port: number, selectChrome: boolean, chromeFlags: string, output: any,
      outputPath: string, interactive: boolean, saveArtifacts: boolean, saveAssets: boolean,
      view: boolean, maxWaitForLoad: number
}

export function getFlags() {
  return yargs.help('help')
      .version(() => pkg.version)
      .showHelpOnFail(false, 'Specify --help for available options')

      .usage('lighthouse <url>')
      .example(
          'lighthouse <url> --view', 'Opens the HTML report in a browser after the run completes')
      .example(
          'lighthouse <url> --config-path=./myconfig.js',
          'Runs Lighthouse with your own configuration: custom audits, report generation, etc.')
      .example(
          'lighthouse <url> --output=json --output-path=./report.json --save-assets',
          'Save trace, screenshots, and named JSON report.')
      .example(
          'lighthouse <url> --disable-device-emulation --disable-network-throttling',
          'Disable device emulation')
      .example(
          'lighthouse <url> --chrome-flags="--window-size=412,732"',
          'Launch Chrome with a specific window size')
      .example(
          'lighthouse <url> --quiet --chrome-flags="--headless"',
          'Launch Headless Chrome, turn off logging')

      // List of options
      .group(['verbose', 'quiet'], 'Logging:')
      .describe({
        verbose: 'Displays verbose logging',
        quiet: 'Displays no progress, debug logs or errors'
      })

      .group(
          [
            'save-assets', 'save-artifacts', 'list-all-audits', 'list-trace-categories',
            'additional-trace-categories', 'config-path', 'chrome-flags', 'perf', 'port',
            'max-wait-for-load'
          ],
          'Configuration:')
      .describe({
        'disable-storage-reset':
            'Disable clearing the browser cache and other storage APIs before a run',
        'disable-device-emulation': 'Disable Nexus 5X emulation',
        'disable-cpu-throttling': 'Disable CPU throttling',
        'disable-network-throttling': 'Disable network throttling',
        'save-assets': 'Save the trace contents & screenshots to disk',
        'save-artifacts': 'Save all gathered artifacts to disk',
        'list-all-audits': 'Prints a list of all available audits and exits',
        'list-trace-categories': 'Prints a list of all required trace categories and exits',
        'additional-trace-categories':
            'Additional categories to capture with the trace (comma-delimited).',
        'config-path': 'The path to the config JSON.',
        'chrome-flags':
            'Custom flags to pass to Chrome (space-delimited). For a full list of flags, see http://peter.sh/experiments/chromium-command-line-switches/.',
        'perf': 'Use a performance-test-only configuration',
        'port': 'The port to use for the debugging protocol. Use 0 for a random port',
        'max-wait-for-load':
            'The timeout (in milliseconds) to wait before the page is considered done loading and the run should continue. WARNING: Very high values can lead to large traces and instability',
        'skip-autolaunch': 'Skip autolaunch of Chrome when already running instance is not found',
        'select-chrome':
            'Interactively choose version of Chrome to use when multiple installations are found',
        'interactive': 'Open Lighthouse in interactive mode'
      })

      .group(['output', 'output-path', 'view'], 'Output:')
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
        'disable-storage-reset', 'disable-device-emulation', 'disable-cpu-throttling',
        'disable-network-throttling', 'save-assets', 'save-artifacts', 'list-all-audits',
        'list-trace-categories', 'perf', 'view', 'skip-autolaunch', 'select-chrome', 'verbose',
        'quiet', 'help', 'interactive'
      ])
      .choices('output', GetValidOutputOptions())

      // default values
      .default('chrome-flags', '')
      .default('disable-cpu-throttling', false)
      .default('output', GetValidOutputOptions()[OutputMode.domhtml])
      .default('port', 0)
      .default('max-wait-for-load', Driver.MAX_WAIT_FOR_FULLY_LOADED)
      .check((argv: {listAllAudits?: boolean, listTraceCategories?: boolean, _: Array<any>}) => {
        // Make sure lighthouse has been passed a url, or at least one of --list-all-audits
        // or --list-trace-categories. If not, stop the program and ask for a url
        if (!argv.listAllAudits && !argv.listTraceCategories && argv._.length === 0) {
          throw new Error('Please provide a url');
        }

        return true;
      })
      .epilogue(
          'For more information on Lighthouse, see https://developers.google.com/web/tools/lighthouse/.')
      .wrap(yargs.terminalWidth())
      .argv;
}
