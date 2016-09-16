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

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const net = require('net');
const rimraf = require('rimraf');
const ask = require('./ask');
const chromeFinder = require('./chrome-finder');

const spawn = childProcess.spawn;
const execSync = childProcess.execSync;
const spawnSync = childProcess.spawnSync;

module.exports = class Launcher {
  constructor(opts) {
    opts = opts || {};
    // choose the first one (default)
    this.autoSelectChrome = defaults(opts.autoSelectChrome, true);
    this.pollInterval = 500;
    this.chrome = null;
    this.prepared = false;
  }

  flags() {
    const flags = [
      '--remote-debugging-port=9222',
      '--no-first-run',
      `--user-data-dir=${this.TMP_PROFILE_DIR}`
    ];

    if (process.platform === 'linux') {
      flags.push('--disable-setuid-sandbox');
    }

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

    console.log(`created ${this.TMP_PROFILE_DIR}`);

    this.prepared = true;
  }

  run() {
    if (!this.prepared) {
      this.prepare();
    }

    return Promise.resolve()
      .then(() => {
        const installations = chromeFinder[process.platform]();

        if (installations.length < 1) {
          return Promise.reject(new Error('No Chrome Installations Found'));
        } else if (installations.length === 1 || this.autoSelectChrome) {
          return installations[0];
        }

        return ask('Choose a Chrome installation to use with Lighthouse', installations);
      })
      .then(execPath => this.spawn(execPath));
  }

  spawn(execPath) {
    return new Promise((resolve, reject) => {
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

      console.log('Chrome running with pid =', chrome.pid);
      resolve(chrome.pid);
    })
    .then(pid => Promise.all([pid, this.waitUntilReady()]));
  }

  cleanup(client) {
    if (client) {
      client.removeAllListeners();
      client.end();
      client.destroy();
      client.unref();
    }
  }

  // resolves if ready, rejects otherwise
  isDebuggerReady() {
    return new Promise((resolve, reject) => {
      const client = net.createConnection(9222);
      client.once('error', err => {
        this.cleanup(client);
        reject(err);
      });
      client.once('connect', _ => {
        this.cleanup(client);
        resolve();
      });
    });
  }

  // resolves when debugger is ready, rejects after 10 polls
  waitUntilReady() {
    const launcher = this;

    return new Promise((resolve, reject) => {
      let retries = 0;
      (function poll() {
        const green = '\x1B[32m';
        const reset = '\x1B[0m';

        if (retries === 0) {
          process.stdout.write('Waiting for browser.');
        }
        retries++;
        process.stdout.write('..');

        launcher
          .isDebuggerReady()
          .then(() => {
            process.stdout.write(`${green}✓${reset}\n`);
            resolve();
          })
          .catch(err => {
            if (retries > 10) {
              process.stdout.write('\n');
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
          this.destroyTmp();
          resolve();
        });

        console.log('Killing all Chrome Instances');
        this.chrome.kill();

        if (process.platform === 'win32') {
          spawnSync(`taskkill /pid ${this.chrome.pid} /T /F`);
        }
      } else {
        // fail silently as we did not start chrome
        resolve();
      }
    });
  }

  destroyTmp() {
    if (this.TMP_PROFILE_DIR) {
      console.log(`Removing ${this.TMP_PROFILE_DIR}`);
      rimraf.sync(this.TMP_PROFILE_DIR);
    }
  }
};

function defaults(val, def) {
  return typeof val === 'undefined' ? def : val;
}

function delay(time) {
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
