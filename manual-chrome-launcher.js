#!/usr/bin/env node

'use strict';
/**
 * @fileoverview Script to launch a clean Chrome instance on-demand.
 *
 * Assuming Lighthouse is installed globally or `npm link`ed, use via:
 *     chrome-debug
 * Optionally pass additional a port, chrome flags and/or a URL
 *     chrome-debug --port=9222
 *     chrome-debug http://goat.com
 *     chrome-debug --show-paint-rects
 */

require('./compiled-check.js')('chrome-launcher.js');
const {launch} = require('./chrome-launcher');

const args = process.argv.slice(2);
let chromeFlags;
let startingUrl;
let port;

if (args.length) {
  chromeFlags = args.filter(flag => flag.startsWith('--'));

  const portFlag = chromeFlags.find(flag => flag.startsWith('--port='));
  port = portFlag && portFlag.replace('--port=', '');

  startingUrl = args.find(flag => !flag.startsWith('--'));
}

launch({
  startingUrl,
  port,
  chromeFlags,
}).then(v => console.log(`✨  Chrome debugging port: ${v.port}`));
