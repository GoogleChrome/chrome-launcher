/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
import {launch} from '../dist/chrome-launcher.js';

const opts = JSON.parse(process.argv[2] || '{}');
const count = opts.count ?? 1;
const relaunch = opts.relaunch === true;
delete opts.count;
delete opts.relaunch;

const flags = ['--headless=new', '--disable-gpu'];
const chromes = [];
for (let i = 0; i < count; i++) {
  chromes.push(await launch({chromeFlags: flags, logLevel: 'silent', ...opts}));
}

const report = () => {
  process.stdout.write(JSON.stringify({
    parent: process.pid,
    chrome: chromes.map((chrome) => chrome.pid),
  }) + '\n');
};

report();

if (relaunch) {
  await new Promise((resolve) => {
    process.stdin.once('data', () => resolve());
  });
  for (const chrome of chromes) chrome.kill();
  chromes.length = 0;
  chromes.push(await launch({chromeFlags: flags, logLevel: 'silent', ...opts}));
  report();
}

setInterval(() => {}, 60_000);
