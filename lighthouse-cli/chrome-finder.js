/**
 * @license
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

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

module.exports = {
  darwin() {
    const suffix = '/Contents/MacOS/Google Chrome Canary';

    const LSREGISTER =
      '/System/Library/Frameworks/CoreServices.framework' +
      '/Versions/A/Frameworks/LaunchServices.framework' +
      '/Versions/A/Support/lsregister';

    const installations = [];

    execSync(
      `${LSREGISTER} -dump` +
      ' | grep -i \'google chrome canary.app$\'' +
      ' | awk \'{$1=""; print $0}\''
    ).toString()
      .split(/\r?\n/)
      .forEach(inst => {
        const execPath = path.join(inst.trim(), suffix);
        if (canAccess(execPath)) {
          installations.push(execPath);
        }
      });

    const priorities = new Map([
      [/^\/Volumes\//, -1],
      [/^\/Applications\//, 100],
      [new RegExp(`^${process.env.HOME}/Applications/`), 50]
    ]);

    return sort(installations, priorities);
  },

  linux() {
    const execPath = process.env.LIGHTHOUSE_CHROMIUM_PATH;
    if (execPath && canAccess(execPath)) {
      return [execPath];
    }
    throw new Error(
      'The environment variable LIGHTHOUSE_CHROMIUM_PATH must be set to ' +
      'executable of a build of Chromium version 52.0 or later.'
    );
  },

  win32() {
    const installations = [];
    const suffix = '\\Google\\Chrome SxS\\Application\\chrome.exe';
    let prefixes = [
      process.env.LOCALAPPDATA,
      process.env.PROGRAMFILES,
      process.env['PROGRAMFILES(X86)']
    ];
    for (let i = 0; i < prefixes.length; i++) {
      const chromeCanaryPath = path.join(prefixes[i], suffix);
      if (canAccess(chromeCanaryPath)) {
        installations.push(chromeCanaryPath);
      }
    }
    return installations;
  }
};

function sort(installations, priorities) {
  const defaultPriority = 10;
  return installations
    // assign priorities
    .map(inst => {
      for (let pair of priorities) {
        const regex = pair[0];
        const priority = pair[1];

        if (regex.test(inst)) {
          return [inst, priority];
        }
      }
      return [inst, defaultPriority];
    })
    // sort based on priorities
    .sort((a, b) => b[1] - a[1])
    // remove priority flag
    .map(pair => pair[0]);
}

function canAccess(file) {
  try {
    fs.accessSync(file);
    return true;
  } catch (e) {
    return false;
  }
}
