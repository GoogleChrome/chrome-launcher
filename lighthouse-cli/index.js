#!/usr/bin/env node

'use strict'

require('./compiled-check.js')('bin.js');
require('./bin.js').run();
