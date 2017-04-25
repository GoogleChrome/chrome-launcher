/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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
const parseURL = require('url').parse;

const mkdirp = require('mkdirp');

const constants = require('./constants.js');
const utils = require('./utils.js');
const config = require('../lighthouse-core/config/plots.json');
const lighthouse = require('../lighthouse-core/index.js');
const ChromeLauncher = require('../lighthouse-cli/chrome-launcher.js').ChromeLauncher;
const Printer = require('../lighthouse-cli/printer');
const assetSaver = require('../lighthouse-core/lib/asset-saver.js');

const NUMBER_OF_RUNS = 20;

const URLS = [
  // Flagship sites
  'https://nytimes.com',
  'https://flipkart.com',
  'http://www.espn.com/',
  'https://www.washingtonpost.com/pwa/',

  // TTI Tester sites
  'https://housing.com/in/buy/real-estate-hyderabad',
  'http://www.npr.org/',
  'http://www.vevo.com/',
  'https://weather.com/',
  'https://www.nasa.gov/',
  'https://vine.co/',
  'http://www.booking.com/',
  'http://www.thestar.com.my',
  'http://www.58pic.com',
  'http://www.dawn.com/',
  'https://www.ebs.in/IPS/',

  // Sourced from: https://en.wikipedia.org/wiki/List_of_most_popular_websites
  // (http://www.alexa.com/topsites)
  // Removed adult websites and duplicates (e.g. google int'l websites)
  // Also removed sites that don't have significant index pages:
  // "t.co", "popads.net", "onclickads.net", "microsoftonline.com", "onclckds.com", "cnzz.com",
  // "live.com", "adf.ly", "googleusercontent.com",

  'https://google.com',
  'https://youtube.com',
  'https://facebook.com',
  'https://baidu.com',
  'https://wikipedia.org',
  'https://yahoo.com',
  'https://amazon.com',
  'http://www.qq.com/',
  'https://taobao.com',
  'https://vk.com',
  'https://twitter.com',
  'https://instagram.com',
  'http://www.hao123.cn/',
  'http://www.sohu.com/',
  'https://sina.com.cn',
  'https://reddit.com',
  'https://linkedin.com',
  'https://tmall.com',
  'https://weibo.com',
  'https://360.cn',
  'https://yandex.ru',
  'https://ebay.com',
  'https://bing.com',
  'https://msn.com',
  'https://www.sogou.com/',
  'https://wordpress.com',
  'https://microsoft.com',
  'https://tumblr.com',
  'https://aliexpress.com',
  'https://blogspot.com',
  'https://netflix.com',
  'https://ok.ru',
  'https://stackoverflow.com',
  'https://imgur.com',
  'https://apple.com',
  'http://www.naver.com/',
  'https://mail.ru',
  'http://www.imdb.com/',
  'https://office.com',
  'https://github.com',
  'https://pinterest.com',
  'https://paypal.com',
  'http://www.tianya.cn/',
  'https://diply.com',
  'https://twitch.tv',
  'https://adobe.com',
  'https://wikia.com',
  'https://coccoc.com',
  'https://so.com',
  'https://fc2.com',
  'https://www.pixnet.net/',
  'https://dropbox.com',
  'https://zhihu.com',
  'https://whatsapp.com',
  'https://alibaba.com',
  'https://ask.com',
  'https://bbc.com'
];

/**
 * Launches Chrome once at the beginning, runs all the analysis,
 * and then kills Chrome.
 * TODO(chenwilliam): measure the overhead of starting chrome, if it's minimal
 * then open a fresh Chrome instance for each run.
 */
function main() {
  if (utils.isDir(constants.OUT_PATH)) {
    console.log('ERROR: Found output from previous run at: ', constants.OUT_PATH); // eslint-disable-line no-console
    console.log('Please run: npm run clean'); // eslint-disable-line no-console
    return;
  }

  const launcher = new ChromeLauncher();
  launcher
    .isDebuggerReady()
    .catch(() => launcher.run())
    .then(() => runAnalysis())
    .then(() => launcher.kill())
    .catch(err => launcher.kill().then(
      () => {
        throw err;
      },
      console.error // eslint-disable-line no-console
    ));
}

main();

/**
 * Returns a promise chain that analyzes all the sites n times.
 * @return {!Promise}
 */
function runAnalysis() {
  let promise = Promise.resolve();

  // Running it n + 1 times because the first run is deliberately ignored
  // because it has different perf characteristics from subsequent runs
  // (e.g. DNS cache which can't be easily reset between runs)
  for (let i = 0; i <= NUMBER_OF_RUNS; i++) {
    // Averages out any order-dependent effects such as memory pressure
    utils.shuffle(URLS);

    const id = i.toString();
    const isFirstRun = i === 0;
    for (const url of URLS) {
      promise = promise.then(() => singleRunAnalysis(url, id, {ignoreRun: isFirstRun}));
    }
  }
  return promise;
}

/**
 * Analyzes a site a single time using lighthouse.
 * @param {string} url
 * @param {string} id
 * @param {{ignoreRun: boolean}} options
 * @return {!Promise}
 */
function singleRunAnalysis(url, id, {ignoreRun}) {
  console.log('Measuring site:', url, 'run:', id); // eslint-disable-line no-console
  const parsedURL = parseURL(url);
  const urlBasedFilename = sanitizeURL(`${parsedURL.host}-${parsedURL.pathname}`);
  const runPath = path.resolve(constants.OUT_PATH, urlBasedFilename, id);
  if (!ignoreRun) {
    mkdirp.sync(runPath);
  }
  const outputPath = path.resolve(runPath, constants.LIGHTHOUSE_RESULTS_FILENAME);
  const assetsPath = path.resolve(runPath, 'assets');
  return analyzeWithLighthouse(url, outputPath, assetsPath, {ignoreRun});
}

/**
 * Runs lighthouse and save the artifacts (not used directly by plots,
 * but may be helpful for debugging outlier runs).
 * @param {string} url
 * @param {string} outputPath
 * @param {string} assetsPath
 * @param {{ignoreRun: boolean}} options
 * @return {!Promise}
 */
function analyzeWithLighthouse(url, outputPath, assetsPath, {ignoreRun}) {
  const flags = {output: 'json'};
  return lighthouse(url, flags, config)
    .then(lighthouseResults => {
      if (ignoreRun) {
        return;
      }
      return assetSaver
        .saveAssets(lighthouseResults.artifacts, lighthouseResults.audits, assetsPath)
        .then(() => {
          lighthouseResults.artifacts = undefined;
          return Printer.write(lighthouseResults, flags.output, outputPath);
        });
    })
    .catch(err => console.error(err)); // eslint-disable-line no-console
}

/**
 * Converts a URL into a filename-friendly string
 * @param {string} string
 * @return {string}
 */
function sanitizeURL(string) {
  const illegalRe = /[\/\?<>\\:\*\|":]/g;
  const controlRe = /[\x00-\x1f\x80-\x9f]/g; // eslint-disable-line no-control-regex
  const reservedRe = /^\.+$/;

  return string
    .replace(illegalRe, '.')
    .replace(controlRe, '\u2022')
    .replace(reservedRe, '')
    .replace(/\s+/g, '_');
}
