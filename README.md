# Chrome Launcher [![Linux Build Status](https://img.shields.io/travis/GoogleChrome/chrome-launcher/master.svg)](https://travis-ci.org/GoogleChrome/chrome-launcher) [![Windows Build Status](https://img.shields.io/appveyor/ci/paulirish/chrome-launcher/master.svg)](https://ci.appveyor.com/project/paulirish/chrome-launcher/branch/master) [![NPM chrome-launcher package](https://img.shields.io/npm/v/chrome-launcher.svg)](https://npmjs.org/package/chrome-launcher)


<img src="https://user-images.githubusercontent.com/39191/29847271-a7ba82f8-8ccf-11e7-8d54-eb88fdf0b6d0.png" align=right height=200>

Launch Google Chrome with ease from node.

* [Disables many Chrome services](https://github.com/GoogleChrome/chrome-launcher/blob/master/flags.ts) that add noise to automated scenarios
* Opens up the browser's `remote-debugging-port` on an available port
* Automagically locates a Chrome binary to launch
* Uses a fresh Chrome profile for each launch, and cleans itself up on `kill()`
* Binds `Ctrl-C` (by default) to terminate the Chrome process
* Exposes a small set of [options](#api) for configurability over these details

### Installing

```sh
yarn add chrome-launcher

# or with npm:
npm install chrome-launcher
```


## API

### `.launch([opts])`

#### Launch options

```js
{
  // (optional) remote debugging port number to use. If provided port is already busy, launch() will reject
  // Default: an available port is autoselected
  port: number;

  // (optional) Additional flags to pass to Chrome, for example: ['--headless', '--disable-gpu']
  // See all flags here: http://peter.sh/experiments/chromium-command-line-switches/
  // Do note, many flags are set by default: https://github.com/GoogleChrome/lighthouse/blob/master/chrome-launcher/flags.ts
  chromeFlags: Array<string>;

  // (optional) Close the Chrome process on `Ctrl-C`
  // Default: true
  handleSIGINT: boolean;

  // (optional) Explicit path of intended Chrome binary
  // * If this `chromePath` option is defined, it will be used.
  // * Otherwise, the `CHROME_PATH` env variable will be used if set. (`LIGHTHOUSE_CHROMIUM_PATH` is deprecated)
  // * Otherwise, a detected Chrome Canary will be used if found
  // * Otherwise, a detected Chrome (stable) will be used
  chromePath: string;

  // (optional) Chrome profile path to use
  // By default, a fresh Chrome profile will be created
  userDataDir: string;

  // (optional) Starting URL to open the browser with
  // Default: `about:blank`
  startingUrl: string;

  // (optional) Logging level: verbose, info, error, silent
  // Default: 'info'
  logLevel: string;

  // (optional) Enable extension loading
  // Default: false
  enableExtensions: boolean;

  // (optional) Interval in ms, which defines how often launcher checks browser port to be ready.
  // Default: 500
  connectionPollInterval: number;

  // (optional) A number of retries, before browser launch considered unsuccessful.
  // Default: 10
  maxConnectionRetries: number;
};
```

#### Launched chrome interface

#### `.launch().then(chrome => ...`

```js
// The remote debugging port exposed by the launched chrome
chrome.port: number;

// Method kill Chrome (and cleanup the profile folder)
chrome.kill: () => Promise<{}>;

// The process id
chrome.pid: number;
```


## Examples

#### Launching chrome:

```js
const chromeLauncher = require('chrome-launcher');

chromeLauncher.launch({
  startingUrl: 'https://google.com'
}).then(chrome => {
  console.log(`Chrome debugging port running on ${chrome.port}`);
});
```


#### Launching headless chrome:

```js
const chromeLauncher = require('chrome-launcher');

chromeLauncher.launch({
  startingUrl: 'https://google.com',
  chromeFlags: ['--headless', '--disable-gpu']
}).then(chrome => {
  console.log(`Chrome debugging port running on ${chrome.port}`);
});
```

### Continuous Integration

In a CI environment like Travis, Chrome may not be installed. If you want to use `chrome-launcher`, Travis can [install Chrome at run time with an addon](https://docs.travis-ci.com/user/chrome).  Alternatively, you can also install Chrome using the [`download-chrome.sh`](https://raw.githubusercontent.com/GoogleChrome/chrome-launcher/v0.8.0/scripts/download-chrome.sh) script.

Then in `.travis.yml`, use it like so:

```yaml
language: node_js
install:
  - yarn install
before_script:
  - export DISPLAY=:99.0
  - export CHROME_PATH="$(pwd)/chrome-linux/chrome"
  - sh -e /etc/init.d/xvfb start
  - sleep 3 # wait for xvfb to boot

addons:
  chrome: stable
```
