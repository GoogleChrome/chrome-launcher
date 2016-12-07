#!/usr/bin/env node

'use strict'

require('./compiled-check.js')('bin.js');
require('./compiled-check.js')('printer.js');
require('./bin.js').run();
