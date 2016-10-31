#!/usr/bin/env node

'use strict'
const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(__dirname, 'bin.js'))) {
  console.log('Oops! Looks like the CLI needs to be compiled. Please run:');
  console.log('   cd lighthouse-cli && npm install && npm run build');
  console.log('More at: https://github.com/GoogleChrome/lighthouse#develop');
  process.exit(1);
}

require('./bin.js').run();
