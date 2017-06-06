/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const execFileSync = require('child_process').execFileSync;

const newLineRegex = /\r?\n/;

type Priorities = Array<{regex: RegExp, weight: number}>;

export function darwin() {
  const suffixes = ['/Contents/MacOS/Google Chrome Canary', '/Contents/MacOS/Google Chrome'];

  const LSREGISTER = '/System/Library/Frameworks/CoreServices.framework' +
      '/Versions/A/Frameworks/LaunchServices.framework' +
      '/Versions/A/Support/lsregister';

  const installations: Array<string> = [];

  execSync(
      `${LSREGISTER} -dump` +
      ' | grep -i \'google chrome\\( canary\\)\\?.app$\'' +
      ' | awk \'{$1=""; print $0}\'')
      .toString()
      .split(newLineRegex)
      .forEach((inst: string) => {
        suffixes.forEach(suffix => {
          const execPath = path.join(inst.trim(), suffix);
          if (canAccess(execPath)) {
            installations.push(execPath);
          }
        });
      });

  // Retains one per line to maintain readability.
  // clang-format off
  const priorities: Priorities = [
    {regex: new RegExp(`^${process.env.HOME}/Applications/.*Chrome.app`), weight: 50},
    {regex: new RegExp(`^${process.env.HOME}/Applications/.*Chrome Canary.app`), weight: 51},
    {regex: /^\/Applications\/.*Chrome.app/, weight: 100},
    {regex: /^\/Applications\/.*Chrome Canary.app/, weight: 101},
    {regex: /^\/Volumes\/.*Chrome.app/, weight: -2},
    {regex: /^\/Volumes\/.*Chrome Canary.app/, weight: -1}
  ];
  // clang-format on

  return sort(installations, priorities);
}

/**
 * Look for linux executables in 3 ways
 * 1. Look into LIGHTHOUSE_CHROMIUM_PATH env variable
 * 2. Look into the directories where .desktop are saved on gnome based distro's
 * 3. Look for google-chrome-stable & google-chrome executables by using the which command
 */
export function linux() {
  let installations: string[] = [];

  // 1. Look into LIGHTHOUSE_CHROMIUM_PATH env variable
  if (canAccess(process.env.LIGHTHOUSE_CHROMIUM_PATH)) {
    installations.push(process.env.LIGHTHOUSE_CHROMIUM_PATH as string);
  }

  // 2. Look into the directories where .desktop are saved on gnome based distro's
  const desktopInstallationFolders = [
    path.join(require('os').homedir(), '.local/share/applications/'),
    '/usr/share/applications/',
  ];
  desktopInstallationFolders.forEach(folder => {
    installations = installations.concat(findChromeExecutables(folder));
  });

  // Look for google-chrome-stable & google-chrome executables by using the which command
  const executables = [
    'google-chrome-stable',
    'google-chrome',
  ];
  executables.forEach((executable: string) => {
    try {
      const chromePath =
          execFileSync('which', [executable]).toString().split(newLineRegex)[0] as string;

      if (canAccess(chromePath)) {
        installations.push(chromePath);
      }
    } catch (e) {
      // Not installed.
    }
  });

  if (!installations.length) {
    throw new Error(
        'The environment variable LIGHTHOUSE_CHROMIUM_PATH must be set to ' +
        'executable of a build of Chromium version 54.0 or later.');
  }

  const priorities: Priorities = [
    {regex: /chrome-wrapper$/, weight: 51}, {regex: /google-chrome-stable$/, weight: 50},
    {regex: /google-chrome$/, weight: 49},
    {regex: new RegExp(process.env.LIGHTHOUSE_CHROMIUM_PATH), weight: 100}
  ];

  return sort(uniq(installations.filter(Boolean)), priorities);
}

export function win32() {
  const installations: Array<string> = [];
  const suffixes = [
    '\\Google\\Chrome SxS\\Application\\chrome.exe', '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const prefixes =
      [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']];

  if (canAccess(process.env.LIGHTHOUSE_CHROMIUM_PATH)) {
    installations.push(process.env.LIGHTHOUSE_CHROMIUM_PATH);
  }

  prefixes.forEach(prefix => suffixes.forEach(suffix => {
    const chromePath = path.join(prefix, suffix);
    if (canAccess(chromePath)) {
      installations.push(chromePath);
    }
  }));
  return installations;
}

function sort(installations: string[], priorities: Priorities) {
  const defaultPriority = 10;
  return installations
      // assign priorities
      .map((inst: string) => {
        for (const pair of priorities) {
          if (pair.regex.test(inst)) {
            return {path: inst, weight: pair.weight};
          }
        }
        return {path: inst, weight: defaultPriority};
      })
      // sort based on priorities
      .sort((a, b) => (b.weight - a.weight))
      // remove priority flag
      .map(pair => pair.path);
}

function canAccess(file: string): Boolean {
  if (!file) {
    return false;
  }

  try {
    fs.accessSync(file);
    return true;
  } catch (e) {
    return false;
  }
}

function uniq(arr: Array<any>) {
  return Array.from(new Set(arr));
}

function findChromeExecutables(folder: string): Array<string> {
  const argumentsRegex = /(^[^ ]+).*/; // Take everything up to the first space
  const chromeExecRegex = '^Exec=\/.*\/(google|chrome|chromium)-.*';

  let installations: Array<string> = [];
  if (canAccess(folder)) {
    // Output of the grep & print looks like:
    //    /opt/google/chrome/google-chrome --profile-directory
    //    /home/user/Downloads/chrome-linux/chrome-wrapper %U
    let execPaths = execSync(`grep -ER "${chromeExecRegex}" ${folder} | awk -F '=' '{print $2}'`)
                        .toString()
                        .split(newLineRegex)
                        .map((execPath: string) => execPath.replace(argumentsRegex, '$1'));

    execPaths.forEach((execPath: string) => canAccess(execPath) && installations.push(execPath));
  }

  return installations;
}
