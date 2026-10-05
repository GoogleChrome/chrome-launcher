/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {describe, it, after} from 'node:test';
import assert from 'assert';
import {spawn, spawnSync, type ChildProcess} from 'child_process';
import {existsSync} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const childScript = path.join(root, 'test/signal-child.mjs');
const leaked: number[] = [];

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killTree(pid: number) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F']);
    return;
  }
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // already gone
    }
  }
}

type ChildResult = {
  parent: number;
  chrome: number[];
  tempProfiles: string[];
  code: number | null;
  signal: NodeJS.Signals | null;
};

function launchAndSignal(
    signal: NodeJS.Signals, opts: Record<string, unknown> = {}): Promise<ChildResult> {
  const child: ChildProcess = spawn(
      process.execPath, [childScript, JSON.stringify(opts)],
      {cwd: root, stdio: ['ignore', 'pipe', 'pipe']});
  let stdout = '';
  let stderr = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`timed out launching chrome\n${stderr}`));
    }, 25_000);
    let announced = false;

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      const line = stdout.split('\n').find((entry) => entry.startsWith('{'));
      if (!line || announced) return;
      announced = true;
      const info = JSON.parse(line) as {parent: number; chrome: number[]; tempProfiles: string[]};
      leaked.push(...info.chrome);
      setTimeout(() => {
        try {
          process.kill(info.parent, signal);
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      }, 200);
    });

    child.on('exit', (code, exitSignal) => {
      clearTimeout(timer);
      if (!announced) {
        reject(new Error(`child exited before launch (${code} ${exitSignal})\n${stderr}`));
        return;
      }
      const info = JSON.parse(stdout.split('\n').find((entry) => entry.startsWith('{'))!) as {
        parent: number;
        chrome: number[];
        tempProfiles: string[];
      };
      setTimeout(() => {
        resolve({
          parent: info.parent,
          chrome: info.chrome,
          tempProfiles: info.tempProfiles,
          code,
          signal: exitSignal,
        });
      }, 1_500);
    });
  });
}

describe('termination signals', () => {
  after(() => {
    for (const pid of leaked) {
      if (isAlive(pid)) killTree(pid);
    }
  });

  it('kills Chrome on SIGINT', {timeout: 30_000}, async () => {
    const result = await launchAndSignal('SIGINT');
    assert.strictEqual(result.code, 130);
    assert.strictEqual(result.signal, null);
    assert.strictEqual(isAlive(result.chrome[0]), false);
  });

  it('kills Chrome on SIGTERM', {timeout: 30_000}, async () => {
    const result = await launchAndSignal('SIGTERM');
    assert.strictEqual(result.code, 143);
    assert.strictEqual(result.signal, null);
    assert.strictEqual(isAlive(result.chrome[0]), false);
  });

  it('removes the temporary profile on SIGTERM', {timeout: 30_000}, async () => {
    const result = await launchAndSignal('SIGTERM');
    assert.ok(result.tempProfiles.length > 0);
    assert.deepStrictEqual(
        result.tempProfiles.map(profile => existsSync(profile)),
        result.tempProfiles.map(() => false),
    );
  });

  it('kills every live Chrome when one launch is still active', {timeout: 30_000}, async () => {
    const result = await launchAndSignal('SIGTERM', {count: 2});
    assert.strictEqual(result.chrome.length, 2);
    assert.strictEqual(isAlive(result.chrome[0]), false);
    assert.strictEqual(isAlive(result.chrome[1]), false);
  });

  it('leaves Chrome alone when handleSIGINT is false', {
    timeout: 30_000,
    skip: process.platform === 'win32' ? 'Chrome is not detached on Windows' : false,
  }, async () => {
    const result = await launchAndSignal('SIGTERM', {handleSIGINT: false});
    assert.notStrictEqual(result.code, 143);
    assert.strictEqual(isAlive(result.chrome[0]), true);
  });

  it('kills Chrome launched again after a real teardown', {timeout: 30_000}, async () => {
    const child = spawn(
        process.execPath, [childScript, JSON.stringify({relaunch: true})],
        {cwd: root, stdio: ['pipe', 'pipe', 'pipe']});
    let stdout = '';
    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const lines = await new Promise<string[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`timed out relaunching chrome\n${stderr}`));
      }, 25_000);
      const seen: string[] = [];
      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
        const parsed = stdout.split('\n').filter((entry) => entry.startsWith('{'));
        if (parsed.length === 1 && seen.length === 0) {
          seen.push(parsed[0]);
          child.stdin?.write('again\n');
        }
        if (parsed.length >= 2) {
          clearTimeout(timer);
          resolve(parsed.slice(0, 2));
        }
      });
    });

    const first = JSON.parse(lines[0]) as {parent: number; chrome: number[]};
    const second = JSON.parse(lines[1]) as {parent: number; chrome: number[]};
    leaked.push(...first.chrome, ...second.chrome);
    assert.notStrictEqual(second.chrome[0], first.chrome[0]);

    const exit = await new Promise<{code: number | null; signal: NodeJS.Signals | null}>(
        (resolve) => {
          child.on('exit', (code, exitSignal) => {
            setTimeout(() => resolve({code, signal: exitSignal}), 1_500);
          });
          process.kill(second.parent, 'SIGTERM');
        });

    assert.strictEqual(exit.code, 143);
    assert.strictEqual(exit.signal, null);
    assert.strictEqual(isAlive(first.chrome[0]), false);
    assert.strictEqual(isAlive(second.chrome[0]), false);
  });
});
