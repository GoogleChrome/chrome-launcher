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
import * as chromeFinder from './chrome-finder';
import {DEFAULT_FLAGS} from './flags';
import {defaults, delay, makeUnixTmpDir, makeWin32TmpDir} from './utils';
import * as net from 'net';
const rimraf = require('rimraf');
const log = require('../lighthouse-core/lib/log');
const spawn = childProcess.spawn;
const execSync = childProcess.execSync;
const isWindows = process.platform === 'win32';
const _SIGINT = 'SIGINT';
const _SIGINT_EXIT_CODE = 130;

type SupportedPlatforms = 'darwin'|'linux'|'win32';

export interface Options {
  startingUrl?: string;
  chromeFlags?: Array<string>;
  autoSelectChrome?: boolean;
  port?: number;
  handleSIGINT?: boolean;
}

export interface LaunchedChrome { kill: () => Promise<{}>; }

export async function launch(opts: Options = {}): Promise<LaunchedChrome> {
  opts.handleSIGINT = defaults(opts.handleSIGINT, true);

  const instance = new ChromeLauncher(opts);

  // Kill spawned Chrome process in case of ctrl-C.
  if (opts.handleSIGINT) {
    process.on(_SIGINT, async () => {
      await instance.kill();
      process.exit(_SIGINT_EXIT_CODE);
    });
  }

  await instance.launch();

  return {kill: instance.kill};
}

class ChromeLauncher {
  prepared = false;
  pollInterval: number = 500;
  autoSelectChrome: boolean;
  TMP_PROFILE_DIR: string;
  outFile?: number;
  errFile?: number;
  pidFile: string;
  startingUrl: string;
  chromeFlags: Array<string>;
  chrome?: childProcess.ChildProcess;
  port: number;

  constructor(opts: Options = {}) {
    // choose the first one (default)
    this.autoSelectChrome = defaults(opts.autoSelectChrome, true);
    this.startingUrl = defaults(opts.startingUrl, 'about:blank');
    this.chromeFlags = defaults(opts.chromeFlags, []);
    this.port = defaults(opts.port, 9222);
  }

  private get flags() {
    const flags = DEFAULT_FLAGS.concat([
      `--remote-debugging-port=${this.port}`,
      // Place Chrome profile in a custom location we'll rm -rf later
      `--user-data-dir=${this.TMP_PROFILE_DIR}`
    ]);

    if (process.platform === 'linux') {
      flags.push('--disable-setuid-sandbox');
    }

    flags.push(...this.chromeFlags);
    flags.push(this.startingUrl);

    return flags;
  }

  private prepare() {
    const platform = process.platform as SupportedPlatforms;

    switch (platform) {
      case 'darwin':
      case 'linux':
        this.TMP_PROFILE_DIR = makeUnixTmpDir();
        break;

      case 'win32':
        this.TMP_PROFILE_DIR = makeWin32TmpDir();
        break;

      default:
        throw new Error(`Platform ${platform} is not supported`);
    }

    this.outFile = fs.openSync(`${this.TMP_PROFILE_DIR}/chrome-out.log`, 'a');
    this.errFile = fs.openSync(`${this.TMP_PROFILE_DIR}/chrome-err.log`, 'a');

    // fix for Node4
    // you can't pass a fd to fs.writeFileSync
    this.pidFile = `${this.TMP_PROFILE_DIR}/chrome.pid`;

    log.verbose('ChromeLauncher', `created ${this.TMP_PROFILE_DIR}`);

    this.prepared = true;
  }

  async launch() {
    if (this.port !== 0) {
      // If an explict port is passed first look for an open connection...
      try {
        return await this.isDebuggerReady();
      } catch (err) {
        log.log(
            'ChromeLauncher',
            `No debugging port found on port ${this.port}, launching a new Chrome.`);
      }
    }

    if (!this.prepared) {
      this.prepare();
    }

    const installations = await chromeFinder[process.platform as SupportedPlatforms]();
    if (installations.length === 0) {
      throw new Error('No Chrome Installations Found');
    }

    const chromePath = installations[0];
    return await this.spawn(chromePath);
  }

  private spawn(execPath: string) {
    const spawnPromise = new Promise(resolve => {
      if (this.chrome) {
        log.log('ChromeLauncher', `Chrome already running with pid ${this.chrome.pid}.`);
        return resolve(this.chrome.pid);
      }

      const chrome = spawn(
          execPath, this.flags, {detached: true, stdio: ['ignore', this.outFile, this.errFile]});
      this.chrome = chrome;

      fs.writeFileSync(this.pidFile, chrome.pid.toString());

      log.verbose('ChromeLauncher', `Chrome running with pid ${chrome.pid} on port ${this.port}.`);
      resolve(chrome.pid);
    });

    return spawnPromise.then(pid => Promise.all([pid, this.waitUntilReady()]));
  }

  private cleanup(client?: net.Socket) {
    if (client) {
      client.removeAllListeners();
      client.end();
      client.destroy();
      client.unref();
    }
  }

  // resolves if ready, rejects otherwise
  private isDebuggerReady(): Promise<{}> {
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
  private waitUntilReady() {
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

        launcher.isDebuggerReady()
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

  kill() {
    return new Promise(resolve => {
      if (this.chrome) {
        this.chrome.on('close', () => {
          this.destroyTmp().then(resolve);
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

  private destroyTmp() {
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
