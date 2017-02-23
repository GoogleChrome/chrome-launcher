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

import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as chromeFinder from './chrome-finder';
import {ask} from './ask';

const mkdirp = require('mkdirp');
import * as net from 'net';
const rimraf = require('rimraf');
const log = require('../lighthouse-core/lib/log');
const spawn = childProcess.spawn;
const execSync = childProcess.execSync;
const isWindows = process.platform === 'win32';

export class ChromeLauncher {
  prepared: Boolean = false
  pollInterval: number = 500
  autoSelectChrome: Boolean
  TMP_PROFILE_DIR: string
  outFile?: number
  errFile?: number
  pidFile: string
  startingUrl: string
  additionalFlags: Array<string>
  chrome?: childProcess.ChildProcess
  port: number

  // We can not use default args here due to support node pre 6.
  constructor(opts?: {
      startingUrl?: string,
      additionalFlags?: Array<string>,
      autoSelectChrome?: Boolean,
      port?: number}) {

        opts = opts || {};

        // choose the first one (default)
        this.autoSelectChrome = defaults(opts.autoSelectChrome, true);
        this.startingUrl = defaults(opts.startingUrl, 'about:blank');
        this.additionalFlags = defaults(opts.additionalFlags, []);
        this.port = defaults(opts.port, 9222);
  }

  flags() {
    const flags = [
      `--remote-debugging-port=${this.port}`,
      // Disable built-in Google Translate service
      '--disable-translate',
      // Disable all chrome extensions entirely
      '--disable-extensions',
      // Disable various background network services, including extension updating,
      //   safe browsing service, upgrade detector, translate, UMA
      '--disable-background-networking',
      // Disable fetching safebrowsing lists, likely redundant due to disable-background-networking
      '--safebrowsing-disable-auto-update',
      // Disable syncing to a Google account
      '--disable-sync',
      // Disable reporting to UMA, but allows for collection
      '--metrics-recording-only',
      // Disable installation of default apps on first run
      '--disable-default-apps',
      // Skip first run wizards
      '--no-first-run',
      // Place Chrome profile in a custom location we'll rm -rf later
      `--user-data-dir=${this.TMP_PROFILE_DIR}`
    ];

    if (process.platform === 'linux') {
      flags.push('--disable-setuid-sandbox');
    }

    flags.push(...this.additionalFlags);
    flags.push(this.startingUrl);

    return flags;
  }

  prepare() {
    switch (process.platform) {
      case 'darwin':
      case 'linux':
        this.TMP_PROFILE_DIR = unixTmpDir();
        break;

      case 'win32':
        this.TMP_PROFILE_DIR = win32TmpDir();
        break;

      default:
        throw new Error('Platform ' + process.platform + ' is not supported');
    }

    this.outFile = fs.openSync(`${this.TMP_PROFILE_DIR}/chrome-out.log`, 'a');
    this.errFile = fs.openSync(`${this.TMP_PROFILE_DIR}/chrome-err.log`, 'a');

    // fix for Node4
    // you can't pass a fd to fs.writeFileSync
    this.pidFile = `${this.TMP_PROFILE_DIR}/chrome.pid`;

    log.verbose('ChromeLauncher', `created ${this.TMP_PROFILE_DIR}`);

    this.prepared = true;
  }

  run() {
    if (!this.prepared) {
      this.prepare();
    }

    return Promise.resolve()
      .then(() => {
        const installations = (<any>chromeFinder)[process.platform]();

        if (installations.length < 1) {
          return Promise.reject(new Error('No Chrome Installations Found'));
        } else if (installations.length === 1 || this.autoSelectChrome) {
          return installations[0];
        }

        return ask('Choose a Chrome installation to use with Lighthouse', installations);
      })
      .then(execPath => this.spawn(execPath));
  }

  spawn(execPath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (this.chrome) {
        log.log('ChromeLauncher', `Chrome already running with pid ${this.chrome.pid}.`);
        return resolve(this.chrome.pid);
      }

      const chrome = spawn(
        execPath,
        this.flags(),
        {
          detached: true,
          stdio: ['ignore', this.outFile, this.errFile]
        }
      );
      this.chrome = chrome;

      fs.writeFileSync(this.pidFile, chrome.pid.toString());

      log.verbose('ChromeLauncher', `Chrome running with pid ${chrome.pid} on port ${this.port}.`);
      resolve(chrome.pid);
    })
    .then(pid => Promise.all([pid, this.waitUntilReady()]));
  }

  cleanup(client?: net.Socket) {
    if (client) {
      client.removeAllListeners();
      client.end();
      client.destroy();
      client.unref();
    }
  }

  // resolves if ready, rejects otherwise
  isDebuggerReady(): Promise<{}> {
    return new Promise((resolve, reject) => {
      const client = net.createConnection(this.port);
      client.once('error', err => {
        this.cleanup(client);
        reject(err);
      });
      client.once('connect', () => {
        this.cleanup(client);
        resolve();
      });
    });
  }

  // resolves when debugger is ready, rejects after 10 polls
  waitUntilReady(): Promise<{}> {
    const launcher = this;

    return new Promise((resolve, reject) => {
      let retries = 0;
      let waitStatus = 'Waiting for browser.';
      (function poll() {
        if (retries === 0) {
          log.log('ChromeLauncher', waitStatus);
        }
        retries++;
        waitStatus += '..';
        log.log('ChromeLauncher', waitStatus);

        launcher
          .isDebuggerReady()
          .then(() => {
            log.log('ChromeLauncher', waitStatus + `${log.greenify(log.tick)}`);
            resolve();
          })
          .catch(err => {
            if (retries > 10) {
              return reject(err);
            }
            delay(launcher.pollInterval).then(poll);
          });
      })();
    });
  }

  kill(): Promise<{}> {
    return new Promise(resolve => {
      if (this.chrome) {
        this.chrome.on('close', () => {
          this.destroyTmp()
            .then(resolve);
        });

        log.log('ChromeLauncher', 'Killing all Chrome Instances');
        try {
          if (isWindows) {
            execSync(`taskkill /pid ${this.chrome.pid} /T /F`);
          } else {
            process.kill(-this.chrome.pid);
          }
        } catch (err) {
          log.warn('ChromeLauncher', `Chrome could not be killed ${err.message}`);
        }

        delete this.chrome;
      } else {
        // fail silently as we did not start chrome
        resolve();
      }
    });
  }

  destroyTmp(): Promise<{}> {
    return new Promise(resolve => {
      if (!this.TMP_PROFILE_DIR) {
        return resolve();
      }

      log.verbose('ChromeLauncher', `Removing ${this.TMP_PROFILE_DIR}`);

      if (this.outFile) {
        fs.closeSync(this.outFile);
        delete this.outFile;
      }

      if (this.errFile) {
        fs.closeSync(this.errFile);
        delete this.errFile;
      }

      rimraf(this.TMP_PROFILE_DIR, () => resolve());
    });
  }
};

function defaults(val: any, def: any) {
  return typeof val === 'undefined' ? def : val;
}

function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

function unixTmpDir() {
  return execSync('mktemp -d -t lighthouse.XXXXXXX').toString().trim();
}

function win32TmpDir() {
  const winTmpPath = process.env.TEMP ||
    process.env.TMP ||
    (process.env.SystemRoot || process.env.windir) + '\\temp';
  const randomNumber = Math.floor(Math.random() * 9e7 + 1e7);
  const tmpdir = path.join(winTmpPath, 'lighthouse.' + randomNumber);

  mkdirp.sync(tmpdir);
  return tmpdir;
}
