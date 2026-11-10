/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import * as childProcess from 'node:child_process';
import {ChildProcess, spawn, spawnSync} from 'node:child_process';
import * as fs from 'node:fs';
import * as net from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';

import * as chromeFinder from './chrome-finder.js';
import {DEFAULT_FLAGS} from './flags.js';
import {defaultLogger, type Logger} from './log.js';
import {ChromeNotInstalledError, getErrorMessage, getPlatform, InvalidUserDataDirectoryError, makeTmpDir, toWin32Path, UnsupportedPlatformError} from './utils.js';

const isWsl = getPlatform() === 'wsl';
const isWindows = getPlatform() === 'win32';
const _SIGINT = 'SIGINT';
const _SIGTERM = 'SIGTERM';
const _SIGINT_EXIT_CODE = 130;
const _SIGTERM_EXIT_CODE = 143;
const _SUPPORTED_PLATFORMS = new Set(['darwin', 'linux', 'win32', 'wsl']);

type SupportedPlatforms = 'darwin'|'linux'|'win32'|'wsl';

const instances = new Set<Launcher>();

// chrome-err.log is opened append-only and can grow past 2 GiB. readFileSync throws
// ERR_FS_FILE_TOO_LARGE at that size, so readiness only looks at the tail.
const STDERR_LOG_TAIL_BYTES = 1024 * 1024;

type JSONLike =|{[property: string]: JSONLike}|readonly JSONLike[]|string|number|boolean|null;

export interface Options {
  startingUrl?: string;
  chromeFlags?: Array<string>;
  prefs?: Record<string, JSONLike>;
  port?: number;
  portStrictMode?: boolean;
  handleSIGINT?: boolean;
  chromePath?: string;
  userDataDir?: string|boolean;
  logger?: Logger;
  ignoreDefaultFlags?: boolean;
  connectionPollInterval?: number;
  maxConnectionRetries?: number;
  envVars?: {[key: string]: string|undefined};
}

export interface RemoteDebuggingPipes {
  incoming: NodeJS.ReadableStream, outgoing: NodeJS.WritableStream,
}

export interface LaunchedChrome {
  pid: number;
  port: number;
  process: ChildProcess;
  remoteDebuggingPipes: RemoteDebuggingPipes|null;
  kill: () => void;
  /** Kills Chrome, so that `using chrome = await launch()` cleans up on scope exit. */
  [Symbol.dispose]: () => void;
}

export interface ModuleOverrides {
  fs?: typeof fs;
  spawn?: typeof childProcess.spawn;
}

// SIGINT is Ctrl-C. SIGTERM is the default `kill` and what process supervisors
// send. Chrome is spawned detached outside Windows, so it outlives the parent
// unless this listener runs killAll() first. See #367.
const terminationListener = (signal: NodeJS.Signals) => {
  killAll();
  process.exit(signal === _SIGTERM ? _SIGTERM_EXIT_CODE : _SIGINT_EXIT_CODE);
};

function listenForTermination() {
  process.on(_SIGINT, terminationListener);
  process.on(_SIGTERM, terminationListener);
}

function unlistenForTermination() {
  process.removeListener(_SIGINT, terminationListener);
  process.removeListener(_SIGTERM, terminationListener);
}

async function launch(opts: Options = {}): Promise<LaunchedChrome> {
  opts.handleSIGINT ??= true;

  const instance = new Launcher(opts);

  // Kill spawned Chrome on SIGINT and SIGTERM. Callers who set
  // `handleSIGINT: false` own both signals themselves.
  if (opts.handleSIGINT && instances.size === 0) {
    listenForTermination();
  }
  instances.add(instance);

  await instance.launch();

  const kill = () => {
    instances.delete(instance);
    if (instances.size === 0) {
      unlistenForTermination();
    }
    instance.kill();
  };

  return {
    pid: instance.pid!,
    port: instance.port!,
    process: instance.chromeProcess!,
    remoteDebuggingPipes: instance.remoteDebuggingPipes,
    kill,
    [Symbol.dispose]: kill,
  };
}

/** Returns Chrome installation path that chrome-launcher will launch by default. */
function getChromePath(): string {
  const installation = Launcher.getFirstInstallation();
  if (!installation) {
    throw new ChromeNotInstalledError();
  }
  return installation;
}

function killAll(): Array<Error> {
  const errors: Error[] = [];
  for (const instance of instances) {
    try {
      instance.kill();
      // only delete if kill did not error
      // this means erroring instances remain in the Set
      instances.delete(instance);
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }
  }
  return errors;
}

class Launcher {
  private tmpDirandPidFileReady = false;
  private pidFile?: string;
  private startingUrl: string;
  private outFile?: number;
  private errFile?: number;
  private chromePath?: string;
  private ignoreDefaultFlags?: boolean;
  private chromeFlags: string[];
  private prefs: Record<string, JSONLike>;
  private requestedPort?: number;
  private portStrictMode?: boolean;
  private useRemoteDebuggingPipe: boolean;
  private connectionPollInterval: number;
  private maxConnectionRetries: number;
  private fs: typeof fs;
  private spawn: typeof childProcess.spawn;
  private useDefaultProfile: boolean;
  private envVars: {[key: string]: string|undefined};
  private log: Logger;

  chromeProcess?: childProcess.ChildProcess;
  userDataDir?: string;
  port?: number;
  remoteDebuggingPipes: RemoteDebuggingPipes|null = null;
  pid?: number;

  private opts: Options;

  constructor(opts: Options = {}, moduleOverrides: ModuleOverrides = {}) {
    this.opts = opts;
    this.fs = moduleOverrides.fs || fs;
    this.spawn = moduleOverrides.spawn || spawn;

    this.log = this.opts.logger ?? defaultLogger;

    // choose the first one (default)
    this.startingUrl = this.opts.startingUrl ?? 'about:blank';
    this.chromeFlags = this.opts.chromeFlags ?? [];
    this.prefs = this.opts.prefs ?? {};
    this.requestedPort = this.opts.port ?? 0;
    this.portStrictMode = opts.portStrictMode;
    this.chromePath = this.opts.chromePath;
    this.ignoreDefaultFlags = this.opts.ignoreDefaultFlags ?? false;
    this.connectionPollInterval = this.opts.connectionPollInterval ?? 500;
    this.maxConnectionRetries = this.opts.maxConnectionRetries ?? 50;
    this.envVars = opts.envVars ?? {...process.env};

    if (typeof this.opts.userDataDir === 'boolean') {
      if (!this.opts.userDataDir) {
        this.useDefaultProfile = true;
        this.userDataDir = undefined;
      } else {
        throw new InvalidUserDataDirectoryError();
      }
    } else {
      this.useDefaultProfile = false;
      this.userDataDir = this.opts.userDataDir;
    }

    // Using startsWith because it could also be --remote-debugging-pipe=cbor
    this.useRemoteDebuggingPipe =
        this.chromeFlags.some(f => f.startsWith('--remote-debugging-pipe'));
  }

  private get flags() {
    const flags = this.ignoreDefaultFlags ? [] : DEFAULT_FLAGS.slice();
    // When useRemoteDebuggingPipe is true, this.port defaults to 0.
    if (!this.useRemoteDebuggingPipe) {
      flags.push(`--remote-debugging-port=${this.port}`);
    }

    if (!this.ignoreDefaultFlags && getPlatform() === 'linux') {
      flags.push('--disable-setuid-sandbox');
    }

    if (!this.useDefaultProfile) {
      // Place Chrome profile in a custom location we'll rm -rf later
      // If in WSL, we need to use the Windows format
      flags.push(`--user-data-dir=${isWsl ? toWin32Path(this.userDataDir) : this.userDataDir}`);
    }

    if (process.env.HEADLESS) flags.push('--headless');

    flags.push(...this.chromeFlags);
    flags.push(this.startingUrl);

    return flags;
  }

  static defaultFlags() {
    return DEFAULT_FLAGS.slice();
  }

  /** Returns the highest priority chrome installation. */
  static getFirstInstallation() {
    if (getPlatform() === 'darwin') return chromeFinder.darwinFast();
    return chromeFinder[getPlatform() as SupportedPlatforms]()[0];
  }

  /** Returns all available chrome installations in decreasing priority order. */
  static getInstallations() {
    return chromeFinder[getPlatform() as SupportedPlatforms]();
  }

  // Wrapper function to enable easy testing.
  makeTmpDir() {
    return makeTmpDir();
  }

  prepare() {
    const platform = getPlatform() as SupportedPlatforms;
    if (!_SUPPORTED_PLATFORMS.has(platform)) {
      throw new UnsupportedPlatformError();
    }

    this.userDataDir = this.userDataDir || this.makeTmpDir();
    try {
      this.outFile = fs.openSync(`${this.userDataDir}/chrome-out.log`, 'a');
      this.errFile = fs.openSync(`${this.userDataDir}/chrome-err.log`, 'a');
    } catch {
      // If userDataDir does not exist on real filesystem (mocked makeTmpDir), ignore.
    }

    this.setBrowserPrefs();

    this.pidFile = `${this.userDataDir}/chrome.pid`;

    this.log.debug(`created ${this.userDataDir}`);

    this.tmpDirandPidFileReady = true;
  }

  private setBrowserPrefs() {
    // don't set prefs if not defined
    if (Object.keys(this.prefs).length === 0) {
      return;
    }

    const profileDir = `${this.userDataDir}/Default`;
    if (!this.fs.existsSync(profileDir)) {
      this.fs.mkdirSync(profileDir, {recursive: true});
    }

    const preferenceFile = `${profileDir}/Preferences`;
    try {
      if (this.fs.existsSync(preferenceFile)) {
        // overwrite existing file
        const file = this.fs.readFileSync(preferenceFile, 'utf-8');
        const content = JSON.parse(file);
        this.fs.writeFileSync(preferenceFile, JSON.stringify({...content, ...this.prefs}), 'utf-8');
      } else {
        // create new Preference file
        this.fs.writeFileSync(preferenceFile, JSON.stringify({...this.prefs}), 'utf-8');
      }
    } catch (err) {
      this.log.info(`Failed to set browser prefs: ${getErrorMessage(err)}`);
    }
  }

  async launch() {
    if (this.requestedPort !== 0) {
      this.port = this.requestedPort;

      // If an explict port is passed first look for an open connection...
      try {
        await this.isDebuggerReady();
        this.log.info(`Found existing Chrome already running using port ${this.port}, using that.`);
        return;
      } catch {
        if (this.portStrictMode) {
          throw new Error(`found no Chrome at port ${this.requestedPort}`);
        }

        this.log.info(`No debugging port found on port ${this.port}, launching a new Chrome.`);
      }
    }
    if (this.chromePath === undefined) {
      const installation = Launcher.getFirstInstallation();
      if (!installation) {
        throw new ChromeNotInstalledError();
      }

      this.chromePath = installation;
    }

    if (!this.tmpDirandPidFileReady) {
      this.prepare();
    }

    this.pid = await this.spawnProcess(this.chromePath);
  }

  private async spawnProcess(execPath: string) {
    const spawnPromise = (async () => {
      if (this.chromeProcess) {
        this.log.info(`Chrome already running with pid ${this.chromeProcess.pid}.`);
        return this.chromeProcess.pid;
      }


      // If a zero value port is set, it means the launcher
      // will let Chrome pick the port, which we read from stderr.
      if (this.requestedPort === 0) {
        this.port = 0;
      }

      this.log.debug(`Launching with command:\n"${execPath}" ${this.flags.join(' ')}`);
      this.chromeProcess = this.spawn(execPath, this.flags, {
        // On non-windows platforms, `detached: true` makes child process a leader of a new
        // process group, making it possible to kill child process tree with `.kill(-pid)` command.
        // @see https://nodejs.org/api/child_process.html#child_process_options_detached
        detached: process.platform !== 'win32',
        stdio: this.useRemoteDebuggingPipe ?
            ['ignore', this.outFile, this.errFile, 'pipe', 'pipe'] :
            ['ignore', this.outFile, this.errFile],
        env: this.envVars
      });

      if (this.chromeProcess.pid && this.pidFile) {
        this.fs.writeFileSync(this.pidFile, this.chromeProcess.pid.toString());
      }
      if (this.useRemoteDebuggingPipe) {
        this.remoteDebuggingPipes = {
          incoming: this.chromeProcess.stdio[4] as NodeJS.ReadableStream,
          outgoing: this.chromeProcess.stdio[3] as NodeJS.WritableStream,
        };
      }

      this.log.debug(`Chrome running with pid ${this.chromeProcess.pid} on port ${this.port}.`);
      return this.chromeProcess.pid;
    })();

    const pid = await spawnPromise;
    // When useRemoteDebuggingPipe is true, this.port defaults to 0 and we do not wait.
    if (!this.useRemoteDebuggingPipe) {
      await this.waitUntilReady();
    }
    return pid;
  }

  private cleanup(client?: net.Socket) {
    if (client) {
      client.removeAllListeners();
      client.end();
      client.destroy();
      client.unref();
    }
  }

  private readChromeStderr(): string {
    const filePath = `${this.userDataDir}/chrome-err.log`;
    const size = fs.statSync(filePath).size;
    const length = Math.min(size, STDERR_LOG_TAIL_BYTES);
    if (length <= 0) {
      return '';
    }

    const fd = fs.openSync(filePath, 'r');
    try {
      const buffer = Buffer.alloc(length);
      const bytesRead = fs.readSync(fd, buffer, 0, length, size - length);
      return buffer.toString('utf8', 0, bytesRead);
    } finally {
      fs.closeSync(fd);
    }
  }

  // The log is append-only, so the last listening line is the current launch.
  private debuggingPortFromStderr(stderr: string): number|undefined {
    const matches = [...stderr.matchAll(/DevTools listening on ws:\/\/.*?:(\d+)\//g)];
    const last = matches.at(-1);
    return last ? parseInt(last[1], 10) : undefined;
  }

  // resolves if ready, rejects otherwise
  private isDebuggerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Note: only meaningful when this.port is set.
      // When useRemoteDebuggingPipe is true, this.port defaults to 0. In that
      // case, we could consider ping-ponging over the pipe, but that may get
      // in the way of the library user, so we do not.
      const client = net.createConnection(this.port!, '127.0.0.1');
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

  // Reads the dynamic port from chrome-err.log if needed, then probes it.
  private async checkReady(): Promise<void> {
    if (this.port === 0) {
      try {
        const port = this.debuggingPortFromStderr(this.readChromeStderr());
        if (port !== undefined) {
          this.port = port;
          this.log.debug(`Discovered Chrome listening on port ${this.port}.`);
        }
      } catch {
        // Ignore read errors until retries expire
      }
    }

    if (this.port === 0) {
      throw new Error('waiting for dynamic debugging port in chrome-err.log');
    }

    await this.isDebuggerReady();
  }

  // resolves when debugger is ready, rejects once maxConnectionRetries is exceeded
  async waitUntilReady(): Promise<void> {
    let waitStatus = 'Waiting for browser.';
    this.log.info(waitStatus);

    for (let retries = 1;; retries++) {
      waitStatus += '..';
      this.log.info(waitStatus);

      try {
        await this.checkReady();
        this.log.info(waitStatus + (isWindows ? '\u221A' : '✓'));
        return;
      } catch (err) {
        if (retries > this.maxConnectionRetries) {
          this.log.error(getErrorMessage(err));
          let stderr = '';
          try {
            stderr = this.readChromeStderr();
          } catch (readErr) {
            stderr = `Failed to read log: ${getErrorMessage(readErr)}`;
          }
          this.log.error(`Logging contents of ${this.userDataDir}/chrome-err.log`);
          this.log.error(stderr);
          throw err;
        }
        await delay(this.connectionPollInterval);
      }
    }
  }

  kill() {
    if (!this.chromeProcess) {
      return;
    }

    this.chromeProcess.on('close', () => {
      delete this.chromeProcess;
      this.destroyTmp();
    });

    this.log.info(`Killing Chrome instance ${this.chromeProcess.pid}`);
    try {
      if (isWindows) {
        // https://github.com/GoogleChrome/chrome-launcher/issues/266
        const taskkillProc = spawnSync(
            'taskkill', ['/pid', `${this.chromeProcess.pid}`, '/T', '/F'], {encoding: 'utf-8'});

        const {stderr} = taskkillProc;
        if (stderr) this.log.error(`taskkill stderr ${stderr}`);
      } else {
        if (this.chromeProcess.pid) {
          process.kill(-this.chromeProcess.pid, 'SIGKILL');
        }
      }
    } catch (err) {
      const message = `Chrome could not be killed ${getErrorMessage(err)}`;
      this.log.warn(message);
    }
    this.destroyTmp();
  }

  destroyTmp() {
    if (this.outFile) {
      try {
        fs.closeSync(this.outFile);
      } catch {
      }
      delete this.outFile;
    }

    if (this.errFile) {
      try {
        fs.closeSync(this.errFile);
      } catch {
      }
      delete this.errFile;
    }

    // Only clean up the tmp dir if we created it.
    if (this.userDataDir === undefined || this.opts.userDataDir !== undefined) {
      return;
    }

    try {
      this.fs.rmSync(
          this.userDataDir, {recursive: true, force: true, maxRetries: 10, retryDelay: 250});
    } catch (err) {
      this.log.warn(
          `Could not delete temporary directory ${this.userDataDir}: ${getErrorMessage(err)}`);
    }
  }
};

export default Launcher;
export {Launcher, launch, killAll, getChromePath};
export type{Logger};
