#!/usr/bin/env node
/**
 * Copyright 2016 Google Inc. All rights reserved.
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

var chalk = require('chalk');
var meow = require('meow');
var lighthouse = require('./');

var cli = meow({
  pkg: './package.json',
  help: [
    'Options',
    '  --help          Show this help',
    '  --version       Current version of package',
    '',
    'Usage',
    '  lighthouse [url]'
  ]
})

lighthouse({
  url: cli.input[0],
  flags: cli.flags
});
