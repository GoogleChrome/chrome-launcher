'use strict'

const fs = require('fs');
const path = require('path');

module.exports = function(filename) {
  if (!fs.existsSync(path.join(__dirname, filename))) {
    console.log(
        'Oops! Looks like the chrome-launcher files needs to be compiled. Please run:');
    console.log('   yarn install-launcher; yarn build-launcher;');
    console.log('More at: https://github.com/GoogleChrome/lighthouse#develop');
    process.exit(1);
  }
}
