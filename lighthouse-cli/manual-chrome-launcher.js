#!/usr/bin/env node

'use strict'
/**
 * @fileoverview Script to launch a clean Chrome instance on-demand.
 * Assuming Lighthouse is installed globally or `npm link`ed, use via:
 *     chrome-debug
 * Optionally pass additional flags and/or a URL
 *     chrome-debug http://goat.com
 *     chrome-debug --show-paint-rects
 */

require('./compiled-check.js')('chrome-launcher.js');

const args = process.argv.slice(2);

let additionalFlags;
let startingUrl;

if (args.length) {
  additionalFlags = args.filter(flag => flag.startsWith('--'));
  startingUrl = args.find(flag => !flag.startsWith('--'));
}

const ChromeLauncher = require('./chrome-launcher.js').ChromeLauncher;
const chromeInstance = new ChromeLauncher({
  startingUrl,
  additionalFlags,
});

chromeInstance.prepare();
chromeInstance.run();

