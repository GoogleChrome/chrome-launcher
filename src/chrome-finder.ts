/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {execFileSync, execSync} from 'node:child_process';
import fs from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';

import {ChromePathNotSetError, getWSLLocalAppDataPath, toWSLPath} from './utils.js';

const newLineRegex = /\r?\n/;

type Matcher = RegExp|((installation: string) => boolean);
type Priorities = Array<{match: Matcher, weight: number}>;

/**
 * check for MacOS default app paths first to avoid waiting for the slow lsregister command
 */
export function darwinFast(): string|undefined {
  const priorityOptions: Array<string|undefined> = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const chromePath of priorityOptions) {
    if (chromePath && canAccess(chromePath)) return chromePath;
  }

  return darwin()[0]
}

export function darwin() {
  const suffixes = ['/Contents/MacOS/Google Chrome Canary', '/Contents/MacOS/Google Chrome'];

  const LSREGISTER = '/System/Library/Frameworks/CoreServices.framework' +
      '/Versions/A/Frameworks/LaunchServices.framework' +
      '/Versions/A/Support/lsregister';

  const installations: Array<string> = [];

  const customChromePath = resolveChromePath();
  if (customChromePath) {
    installations.push(customChromePath);
  }

  execSync(
      `${LSREGISTER} -dump` +
      ' | grep -i \'google chrome\\( canary\\)\\?\\.app\'' +
      ' | awk \'{$1=""; print $0}\'')
      .toString()
      .split(newLineRegex)
      .forEach((inst: string) => {
        suffixes.forEach(suffix => {
          const execPath = path.join(inst.substring(0, inst.indexOf('.app') + 4).trim(), suffix);
          if (canAccess(execPath) && !installations.includes(execPath)) {
            installations.push(execPath);
          }
        });
      });


  // Retains one per line to maintain readability.
  // clang-format off
  const homeApplications = `${process.env.HOME || homedir()}/Applications/`;
  const inHomeApplications = (app: string) => (inst: string) =>
      inst.startsWith(homeApplications) && inst.includes(app, homeApplications.length);
  const priorities: Priorities = [
    {match: inHomeApplications('Chrome.app'), weight: 50},
    {match: inHomeApplications('Chrome Canary.app'), weight: 51},
    {match: /^\/Applications\/.*Chrome.app/, weight: 100},
    {match: /^\/Applications\/.*Chrome Canary.app/, weight: 101},
    {match: /^\/Volumes\/.*Chrome.app/, weight: -2},
    {match: /^\/Volumes\/.*Chrome Canary.app/, weight: -1},
  ];

  if (process.env.CHROME_PATH) {
    const chromePath = process.env.CHROME_PATH;
    priorities.unshift({match: inst => inst.includes(chromePath), weight: 151});
  }

  // clang-format on
  return sort(installations, priorities);
}

function resolveChromePath() {
  if (canAccess(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  return undefined;
}

/**
 * Look for linux executables in 3 ways
 * 1. Look into CHROME_PATH env variable
 * 2. Look into the directories where .desktop are saved on gnome based distro's
 * 3. Look for google-chrome-stable & google-chrome executables by using the which command
 */
export function linux() {
  let installations: string[] = [];

  // 1. Look into CHROME_PATH env variable
  const customChromePath = resolveChromePath();
  if (customChromePath) {
    installations.push(customChromePath);
  }

  // 2. Look into the directories where .desktop are saved on gnome based distro's
  const desktopInstallationFolders = [
    path.join(homedir(), '.local/share/applications/'),
    '/usr/share/applications/',
  ];
  desktopInstallationFolders.forEach(folder => {
    installations = installations.concat(findChromeExecutables(folder));
  });

  // Look for google-chrome(-stable) & chromium(-browser) executables by using the which command
  const executables = [
    'google-chrome-stable',
    'google-chrome',
    'chromium-browser',
    'chromium',
  ];
  executables.forEach((executable: string) => {
    try {
      const chromePath =
          execFileSync('which', [executable], {stdio: 'pipe'}).toString().split(newLineRegex)[0];

      if (canAccess(chromePath)) {
        installations.push(chromePath);
      }
    } catch {
      // Not installed.
    }
  });

  if (!installations.length) {
    throw new ChromePathNotSetError();
  }

  const priorities: Priorities = [
    {match: /chrome-wrapper$/, weight: 51},
    {match: /google-chrome-stable$/, weight: 50},
    {match: /google-chrome$/, weight: 49},
    {match: /chromium-browser$/, weight: 48},
    {match: /chromium$/, weight: 47},
  ];

  if (process.env.CHROME_PATH) {
    const chromePath = process.env.CHROME_PATH;
    priorities.unshift({match: inst => inst.includes(chromePath), weight: 101});
  }

  return sort([...new Set(installations.filter(Boolean))], priorities);
}

export function wsl() {
  // Manually populate the environment variables assuming it's the default config
  process.env.LOCALAPPDATA = getWSLLocalAppDataPath(`${process.env.PATH}`);
  process.env.PROGRAMFILES = toWSLPath('C:/Program Files', '/mnt/c/Program Files');
  process.env['PROGRAMFILES(X86)'] =
      toWSLPath('C:/Program Files (x86)', '/mnt/c/Program Files (x86)');

  return win32();
}

export function win32() {
  const installations: Array<string> = [];
  const suffixes = [
    `${path.sep}Google${path.sep}Chrome SxS${path.sep}Application${path.sep}chrome.exe`,
    `${path.sep}Google${path.sep}Chrome${path.sep}Application${path.sep}chrome.exe`
  ];
  const prefixes = [
    process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']
  ].filter(Boolean) as string[];

  const customChromePath = resolveChromePath();
  if (customChromePath) {
    installations.push(customChromePath);
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
          const {match} = pair;
          if (typeof match === 'function' ? match(inst) : match.test(inst)) {
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

function canAccess(file: string|undefined): boolean {
  if (!file) {
    return false;
  }

  try {
    fs.accessSync(file);
    return true;
  } catch {
    return false;
  }
}

function findChromeExecutables(folder: string): Array<string> {
  const chromeExecRegex = /^Exec=\/.*\/(google-chrome|chrome|chromium)-.*/;

  const installations: Array<string> = [];
  if (!canAccess(folder)) {
    return installations;
  }

  let entries: string[];
  try {
    entries = fs.readdirSync(folder, {recursive: true, encoding: 'utf8'});
  } catch {
    return installations;
  }

  for (const entry of entries) {
    let contents: string;
    try {
      contents = fs.readFileSync(path.join(folder, entry), 'utf8');
    } catch {
      // Directories and unreadable files.
      continue;
    }

    for (const line of contents.split(newLineRegex)) {
      if (!chromeExecRegex.test(line)) {
        continue;
      }
      // Matching lines look like:
      //    Exec=/opt/google/chrome/google-chrome --profile-directory=Default
      //    Exec=/home/user/Downloads/chrome-linux/chrome-wrapper %U
      // Take the value up to the next `=`, then everything up to the first space.
      const execPath = line.split('=')[1].split(' ')[0];
      if (canAccess(execPath)) {
        installations.push(execPath);
      }
    }
  }

  return installations;
}
