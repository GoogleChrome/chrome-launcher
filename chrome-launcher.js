/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const childProcess = require("child_process");
const fs = require("fs");
const net = require("net");
const rimraf = require("rimraf");
const chromeFinder = require("./chrome-finder");
const random_port_1 = require("./random-port");
const flags_1 = require("./flags");
const utils_1 = require("./utils");
const log = require('lighthouse-logger');
const spawn = childProcess.spawn;
const execSync = childProcess.execSync;
const isWsl = utils_1.getPlatform() === 'wsl';
const isWindows = utils_1.getPlatform() === 'win32';
const _SIGINT = 'SIGINT';
const _SIGINT_EXIT_CODE = 130;
const _SUPPORTED_PLATFORMS = new Set(['darwin', 'linux', 'win32', 'wsl']);
const instances = new Set();
const sigintListener = () => __awaiter(this, void 0, void 0, function* () {
    for (const instance of instances) {
        yield instance.kill();
    }
    process.exit(_SIGINT_EXIT_CODE);
});
function launch(opts = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        opts.handleSIGINT = utils_1.defaults(opts.handleSIGINT, true);
        const instance = new Launcher(opts);
        // Kill spawned Chrome process in case of ctrl-C.
        if (opts.handleSIGINT && instances.size === 0) {
            process.on(_SIGINT, sigintListener);
        }
        instances.add(instance);
        yield instance.launch();
        const kill = () => __awaiter(this, void 0, void 0, function* () {
            instances.delete(instance);
            if (instances.size === 0) {
                process.removeListener(_SIGINT, sigintListener);
            }
            return instance.kill();
        });
        return { pid: instance.pid, port: instance.port, kill, chromeProcess: instance.chrome };
    });
}
exports.launch = launch;
class Launcher {
    constructor(opts = {}, moduleOverrides = {}) {
        this.opts = opts;
        this.tmpDirandPidFileReady = false;
        this.fs = moduleOverrides.fs || fs;
        this.rimraf = moduleOverrides.rimraf || rimraf;
        this.spawn = moduleOverrides.spawn || spawn;
        log.setLevel(utils_1.defaults(this.opts.logLevel, 'silent'));
        // choose the first one (default)
        this.startingUrl = utils_1.defaults(this.opts.startingUrl, 'about:blank');
        this.chromeFlags = utils_1.defaults(this.opts.chromeFlags, []);
        this.requestedPort = utils_1.defaults(this.opts.port, 0);
        this.chromePath = this.opts.chromePath;
        this.enableExtensions = utils_1.defaults(this.opts.enableExtensions, false);
        this.connectionPollInterval = utils_1.defaults(this.opts.connectionPollInterval, 500);
        this.maxConnectionRetries = utils_1.defaults(this.opts.maxConnectionRetries, 50);
    }
    get flags() {
        let flags = flags_1.DEFAULT_FLAGS.concat([
            `--remote-debugging-port=${this.port}`,
            // Place Chrome profile in a custom location we'll rm -rf later
            // If in WSL, we need to use the Windows format
            `--user-data-dir=${isWsl ? utils_1.toWinDirFormat(this.userDataDir) : this.userDataDir}`
        ]);
        if (this.enableExtensions) {
            flags = flags.filter(flag => flag !== '--disable-extensions');
        }
        if (utils_1.getPlatform() === 'linux') {
            flags.push('--disable-setuid-sandbox');
        }
        flags.push(...this.chromeFlags);
        flags.push(this.startingUrl);
        return flags;
    }
    // Wrapper function to enable easy testing.
    makeTmpDir() {
        return utils_1.makeTmpDir();
    }
    prepare() {
        const platform = utils_1.getPlatform();
        if (!_SUPPORTED_PLATFORMS.has(platform)) {
            throw new Error(`Platform ${platform} is not supported`);
        }
        this.userDataDir = this.opts.userDataDir || this.makeTmpDir();
        this.outFile = this.fs.openSync(`${this.userDataDir}/chrome-out.log`, 'a');
        this.errFile = this.fs.openSync(`${this.userDataDir}/chrome-err.log`, 'a');
        // fix for Node4
        // you can't pass a fd to fs.writeFileSync
        this.pidFile = `${this.userDataDir}/chrome.pid`;
        log.verbose('ChromeLauncher', `created ${this.userDataDir}`);
        this.tmpDirandPidFileReady = true;
    }
    launch() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.requestedPort !== 0) {
                this.port = this.requestedPort;
                // If an explict port is passed first look for an open connection...
                try {
                    return yield this.isDebuggerReady();
                }
                catch (err) {
                    log.log('ChromeLauncher', `No debugging port found on port ${this.port}, launching a new Chrome.`);
                }
            }
            if (this.chromePath === undefined) {
                const installations = yield chromeFinder[utils_1.getPlatform()]();
                if (installations.length === 0) {
                    throw new Error('No Chrome Installations Found');
                }
                this.chromePath = installations[0];
            }
            if (!this.tmpDirandPidFileReady) {
                this.prepare();
            }
            this.pid = yield this.spawnProcess(this.chromePath);
            return Promise.resolve();
        });
    }
    spawnProcess(execPath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Typescript is losing track of the return type without the explict typing.
            const spawnPromise = (() => __awaiter(this, void 0, void 0, function* () {
                if (this.chrome) {
                    log.log('ChromeLauncher', `Chrome already running with pid ${this.chrome.pid}.`);
                    return this.chrome.pid;
                }
                // If a zero value port is set, it means the launcher
                // is responsible for generating the port number.
                // We do this here so that we can know the port before
                // we pass it into chrome.
                if (this.requestedPort === 0) {
                    this.port = yield random_port_1.getRandomPort();
                }
                log.verbose('ChromeLauncher', `Launching with command:\n"${execPath}" ${this.flags.join(' ')}`);
                const chrome = this.spawn(execPath, this.flags, { detached: true, stdio: ['ignore', this.outFile, this.errFile] });
                this.chrome = chrome;
                this.fs.writeFileSync(this.pidFile, chrome.pid.toString());
                log.verbose('ChromeLauncher', `Chrome running with pid ${chrome.pid} on port ${this.port}.`);
                return chrome.pid;
            }))();
            const pid = yield spawnPromise;
            yield this.waitUntilReady();
            return pid;
        });
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
    waitUntilReady() {
        const launcher = this;
        return new Promise((resolve, reject) => {
            let retries = 0;
            let waitStatus = 'Waiting for browser.';
            const poll = () => {
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
                    if (retries > launcher.maxConnectionRetries) {
                        log.error('ChromeLauncher', err.message);
                        const stderr = this.fs.readFileSync(`${this.userDataDir}/chrome-err.log`, { encoding: 'utf-8' });
                        log.error('ChromeLauncher', `Logging contents of ${this.userDataDir}/chrome-err.log`);
                        log.error('ChromeLauncher', stderr);
                        return reject(err);
                    }
                    utils_1.delay(launcher.connectionPollInterval).then(poll);
                });
            };
            poll();
        });
    }
    kill() {
        return new Promise(resolve => {
            if (this.chrome) {
                this.chrome.on('close', () => {
                    this.destroyTmp().then(resolve);
                });
                log.log('ChromeLauncher', `Killing Chrome instance ${this.chrome.pid}`);
                try {
                    if (isWindows) {
                        execSync(`taskkill /pid ${this.chrome.pid} /T /F`);
                    }
                    else {
                        process.kill(-this.chrome.pid);
                    }
                }
                catch (err) {
                    log.warn('ChromeLauncher', `Chrome could not be killed ${err.message}`);
                }
                delete this.chrome;
            }
            else {
                // fail silently as we did not start chrome
                resolve();
            }
        });
    }
    destroyTmp() {
        return new Promise(resolve => {
            // Only clean up the tmp dir if we created it.
            if (this.userDataDir === undefined || this.opts.userDataDir !== undefined) {
                return resolve();
            }
            if (this.outFile) {
                this.fs.closeSync(this.outFile);
                delete this.outFile;
            }
            if (this.errFile) {
                this.fs.closeSync(this.errFile);
                delete this.errFile;
            }
            this.rimraf(this.userDataDir, () => resolve());
        });
    }
}
exports.Launcher = Launcher;
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hyb21lLWxhdW5jaGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2hyb21lLWxhdW5jaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7O0dBSUc7QUFFSCxZQUFZLENBQUM7Ozs7Ozs7Ozs7QUFFYiw4Q0FBOEM7QUFDOUMseUJBQXlCO0FBQ3pCLDJCQUEyQjtBQUMzQixpQ0FBaUM7QUFDakMsZ0RBQWdEO0FBQ2hELCtDQUE0QztBQUM1QyxtQ0FBc0M7QUFDdEMsbUNBQWlGO0FBRWpGLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ3pDLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUM7QUFDakMsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQztBQUN2QyxNQUFNLEtBQUssR0FBRyxtQkFBVyxFQUFFLEtBQUssS0FBSyxDQUFDO0FBQ3RDLE1BQU0sU0FBUyxHQUFHLG1CQUFXLEVBQUUsS0FBSyxPQUFPLENBQUM7QUFDNUMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDO0FBQ3pCLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDO0FBQzlCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBSTFFLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7QUE0QjVCLE1BQU0sY0FBYyxHQUFHO0lBQ3JCLEdBQUcsQ0FBQyxDQUFDLE1BQU0sUUFBUSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUEsQ0FBQztBQUVGLGdCQUE2QixPQUFnQixFQUFFOztRQUM3QyxJQUFJLENB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