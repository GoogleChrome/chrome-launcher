/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {join} from 'path';
import {execSync, execFileSync} from 'child_process';
import {mkdirSync} from 'fs';
import isWsl = require('is-wsl');

export const enum LaunchErrorCodes {
  ERR_LAUNCHER_PATH_NOT_SET = 'ERR_LAUNCHER_PATH_NOT_SET',
  ERR_LAUNCHER_INVALID_USER_DATA_DIRECTORY = 'ERR_LAUNCHER_INVALID_USER_DATA_DIRECTORY',
  ERR_LAUNCHER_UNSUPPORTED_PLATFORM = 'ERR_LAUNCHER_UNSUPPORTED_PLATFORM',
  ERR_LAUNCHER_NOT_INSTALLED = 'ERR_LAUNCHER_NOT_INSTALLED',
}

export function defaults<T>(val: T|undefined, def: T): T {
  return typeof val === 'undefined' ? def : val;
}

export async function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

export class LauncherError extends Error {
  constructor(public message: string = 'Unexpected error', public code?: string) {
    super();
    this.stack = new Error().stack;
    return this;
  }
}

export class ChromePathNotSetError extends LauncherError {
  message =
      'The CHROME_PATH environment variable must be set to a Chrome/Chromium executable no older than Chrome stable.';
  code = LaunchErrorCodes.ERR_LAUNCHER_PATH_NOT_SET;
}

export class InvalidUserDataDirectoryError extends LauncherError {
  message = 'userDataDir must be false or a path.';
  code = LaunchErrorCodes.ERR_LAUNCHER_INVALID_USER_DATA_DIRECTORY;
}

export class UnsupportedPlatformError extends LauncherError {
  message = `Platform ${getPlatform()} is not supported.`;
  code = LaunchErrorCodes.ERR_LAUNCHER_UNSUPPORTED_PLATFORM;
}

export class ChromeNotInstalledError extends LauncherError {
  message = 'No Chrome installations found.';
  code = LaunchErrorCodes.ERR_LAUNCHER_NOT_INSTALLED;
}

export function getPlatform() {
  return isWsl ? 'wsl' : process.platform;
}

export function makeTmpDir() {
  switch (getPlatform()) {
    case 'darwin':
    case 'linux':
      return makeUnixTmpDir();
    case 'wsl':
      // We populate the user's Windows temp dir so the folder is correctly created later
      process.env.TEMP = getWSLLocalAppDataPath(`${process.env.PATH}`);
    case 'win32':
      return makeWin32TmpDir();
    default:
      throw new UnsupportedPlatformError();
  }
}

function toWinDirFormat(dir: string = ''): string {
  const results = /\/mnt\/([a-z])\//.exec(dir);

  if (!results) {
    return dir;
  }

  const driveLetter = results[1];
  return dir.replace(`/mnt/${driveLetter}/`, `${driveLetter.toUpperCase()}:\\`)
      .replace(/\//g, '\\');
}

export function toWin32Path(dir: string = ''): string {
  if (/[a-z]:\\/iu.test(dir)) {
    return dir;
  }

  try {
    return execFileSync('wslpath', ['-w', dir]).toString().trim();
  } catch {
    return toWinDirFormat(dir);
  }
}

export function toWSLPath(dir: string, fallback: string): string {
  try {
    return execFileSync('wslpath', ['-u', dir]).toString().trim();
  } catch {
    return fallback;
  }
}

function getLocalAppDataPath(path: string): string {
  const userRegExp = /\/mnt\/([a-z])\/Users\/([^\/:]+)\/AppData\//;
  const results = userRegExp.exec(path) || [];

  return `/mnt/${results[1]}/Users/${results[2]}/AppData/Local`;
}

export function getWSLLocalAppDataPath(path: string): string {
  const userRegExp = /\/([a-z])\/Users\/([^\/:]+)\/AppData\//;
  const results = userRegExp.exec(path) || [];

  return toWSLPath(
      `${results[1]}:\\Users\\${results[2]}\\AppData\\Local`, getLocalAppDataPath(path));
}

function makeUnixTmpDir() {
  return execSync('mktemp -d -t lighthouse.XXXXXXX').toString().trim();
}

function makeWin32TmpDir() {
  const winTmpPath = process.env.TEMP || process.env.TMP ||
      (process.env.SystemRoot || process.env.windir) + '\\temp';
  const randomNumber = Math.floor(Math.random() * 9e7 + 1e7);
  const tmpdir = join(winTmpPath, 'lighthouse.' + randomNumber);

  mkdirSync(tmpdir, {recursive: true});
  return tmpdir;
}
