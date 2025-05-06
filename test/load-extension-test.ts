
/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import * as ChromeLauncher from '../src/chrome-launcher.js';
import * as assert from 'assert';

import log from 'lighthouse-logger';

import {createServer} from 'http';
import {AddressInfo} from 'net';
import {fileURLToPath} from 'url';

// Awaited is in TypeScript 4.5, but the project uses typescript@^4.1.2
type Awaited<T> = T extends Promise<infer U>? U : T

/**
 * Create test server listening at localhost to detect extension execution
 * via a request to /hello_from_extension.
 */
async function startTestServer() {
  let resolveHelloFromExtension: Function;
  const promiseHelloFromExtension = new Promise(resolve => {
    resolveHelloFromExtension = resolve;
  });
  const server = createServer((req, res) => {
    if (req.url === '/start_extension_test') {
      res.end('Start page so extension can discover the URL at runtime');
      return;
    }
    if (req.url === '/hello_from_extension') {
      res.end(); // Don't care about response.
      resolveHelloFromExtension();
      return;
    }
    // favicon.ico, etc.
    res.writeHead(404);
    res.end();
  });
  const port = await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1');
    server.once('listening', () => {
      resolve((server.address() as AddressInfo).port);
    });

    server.once('error', reject);
  });
  return {
    promiseHelloFromExtension,
    startUrl: `http://127.0.0.1:${port}/start_extension_test`,
    close: () => new Promise(resolve => server.close(() => resolve(undefined))),
  };
}

function getFilePath(fixtureName: string) {
  return fileURLToPath(import.meta.url.replace('load-extension-test.ts', fixtureName));
}

describe('Load extension', () => {
  let server: Awaited<ReturnType<typeof startTestServer>>;

  beforeEach(async () => {
    log.setLevel('error');
  });

  afterEach(async () => {
    log.setLevel('');
    await server?.close();
  });

  // Note: --load-extension in chromeFlags used to be the primary method of
  // loading extensions, but this is removed from official stable Chrome builds
  // starting from Chrome 137. This shows the officially supported way to load
  // extensions, with --remote-debugging-pipe.
  // See: "Removing the `--load-extension` flag in branded Chrome builds"
  // https://groups.google.com/a/chromium.org/g/chromium-extensions/c/aEHdhDZ-V0E/m/UWP4-k32AgAJ
  it('loadExtension via remote-debugging-pipe', async () => {
    server = await startTestServer();

    const chromeFlags =
        ChromeLauncher.Launcher.defaultFlags().filter(flag => flag !== '--disable-extensions');
    chromeFlags.push('--remote-debugging-pipe', '--enable-unsafe-extension-debugging');
    const chromeInstance = await ChromeLauncher.launch({
      ignoreDefaultFlags: true, // Keep --disable-extensions out of flags
      chromeFlags,
      startingUrl: server.startUrl,
    });
    assert.equal(chromeInstance.port, 0, 'No --remote-debugging-port');

    const remoteDebuggingPipes = chromeInstance.remoteDebuggingPipes!;

    let firstResponsePromise = new Promise((resolve, reject) => {
      remoteDebuggingPipes.incoming.on('error', error => reject(error));
      remoteDebuggingPipes.incoming.on('close', () => {
        // If resolve() has not been called yet, consider it failed.
        // Note that the pipe closes if the process exits early.
        reject(new Error('Pipe closed before a response was received'));
      });
      // When the first data listener is added, the stream starts flowing.
      // Always add a listener, even if you don't use it; otherwise the pipe
      // will be clogged with data and Chrome may fail to write eventually.
      let pendingMessages = '';
      remoteDebuggingPipes.incoming.on('data', chunk => {
        pendingMessages += chunk;
        let end = pendingMessages.indexOf('\x00');
        while (end !== -1) {
          const wholeMessage = pendingMessages.slice(0, end);
          pendingMessages = pendingMessages.slice(end + 1); // +1 = skip \x00.
          end = pendingMessages.indexOf('\x00');

          // Handle response. In this specific test, we expect only one
          // response, so let's resolve immediately.
          resolve(JSON.parse(wholeMessage));
        }
      });
    });
    const request = {
      id: 1337, // NOTE: should be a unique integer, e.g. a random value.
      method: 'Extensions.loadUnpacked',
      params: {path: getFilePath('chrome_extension_fixture')},
    };
    remoteDebuggingPipes.outgoing.write(JSON.stringify(request) + '\x00');
    const expectedResponse = {
      id: 1337,
      result: {id: 'gpehbnajinmdnomnoadgbmkjoohjfjco'},
    };
    const response = await firstResponsePromise;
    assert.deepStrictEqual(response, expectedResponse);

    await server.promiseHelloFromExtension;
    assert.ok(true, 'Extension executed code and notified our test server.');
    chromeInstance.kill();
  });
});
