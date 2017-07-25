#!/usr/bin/env node

'use strict';
/**
 * @fileoverview Script to launch a clean Chrome instance on-demand.
 *
 * Assuming Lighthouse is installed globally or `npm link`ed, use via:
 *     chrome-debug
 * Optionally enable extensions or pass a port, additional chrome flags, and/or a URL
 *     chrome-debug --port=9222
 *     chrome-debug http://goat.com
 *     chrome-debug --show-paint-rects
 *     chrome-debug --enable-extensions
 */

require('./compiled-check.js')('chrome-launcher.js');
const {launch} = require('./chrome-launcher');

const args = process.argv.slice(2);
let chromeFlags;
let startingUrl;
let port;
let enableExtensions;

if (args.length) {
  chromeFlags = args.filter(flag => flag.startsWith('--'));

  const portFlag = chromeFlags.find(flag => flag.startsWith('--port='));
  port = portFlag && portFlag.replace('--port=', '');

  enableExtensions = !!chromeFlags.find(flag => flag === '--enable-extensions');

  startingUrl = args.find(flag => !flag.startsWith('--'));
}

launch({
  startingUrl,
  port,
  enableExtensions,
  chromeFlags,
}).then(v => console.log(`✨  Chrome debugging port: ${v.port}`));
