#!/usr/bin/env node

'use strict'

require('./compiled-check.js')('bin.js');
require('./compiled-check.js')('printer.js');
require('./compiled-check.js')('shim-modules.js');
require('./compiled-check.js')('../lighthouse-core/report/templates/report-templates.js');

require('./bin.js').run();
