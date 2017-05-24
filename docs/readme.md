This directory contains useful documentation, examples (keep reading),
and [recipes](./recipes/) to get you started. For an overview of Lighthouse's
internals, see [Lighthouse Architecture](architecture.md).

## Using programmatically

The example below shows how to run Lighthouse programmatically as a Node module. It
assumes you've installed Lighthouse as a dependency (`yarn add --dev lighthouse`).

```javascript
const lighthouse = require('lighthouse');
const chromeLauncher = require('lighthouse/chrome-launcher/chrome-launcher');

function launchChromeAndRunLighthouse(url, flags, config = null) {
  return chromeLauncher.launch().then(chrome => {
    flags.port = chrome.port;
    return lighthouse(url, flags, config).then(results =>
      chrome.kill().then(() => results)
    );
  });
}

const flags = {output: 'json'};

// Usage:
launchChromeAndRunLighthouse('https://example.com', flags).then(results => {
  // Use results!
});
```

### Turn on logging

If you want to see log output as Lighthouse runs, include the `log` module
and set an appropriate logging level in your code. You'll also need to pass
the `logLevel` flag when calling `lighthouse`.

```javascript
const log = require('lighthouse/lighthouse-core/lib/log');

const flags = {logLevel: 'info', output: 'json'};
log.setLevel(flags.logLevel);

launchChromeAndRunLighthouse('https://example.com', flags).then(...);
```

## Testing on a site with authentication

When installed globally via `npm i -g lighthouse` or `yarn global add lighthouse`,
`chrome-debug` is added to your `PATH`. This binary launches a standalone Chrome
instance with an open debugging port.

- Run `chrome-debug`
- navigate to and log in to your site
- in a separate terminal tab `lighthouse http://mysite.com`

## Testing on a mobile device

Lighthouse can run against a real mobile device. You can follow the [Remote Debugging on Android (Legacy Workflow)](https://developer.chrome.com/devtools/docs/remote-debugging-legacy) up through step 3.3, but the TL;DR is install & run adb, enable USB debugging, then port forward 9222 from the device to the machine with Lighthouse.

You'll likely want to use the CLI flags `--disable-device-emulation --disable-cpu-throttling` and potentially `--disable-network-throttling`.

```sh
$ adb kill-server

$ adb devices -l
* daemon not running. starting it now on port 5037 *
* daemon started successfully *
00a2fd8b1e631fcb       device usb:335682009X product:bullhead model:Nexus_5X device:bullhead

$ adb forward tcp:9222 localabstract:chrome_devtools_remote

$ lighthouse --disable-device-emulation --disable-cpu-throttling https://mysite.com
```

## Lighthouse as trace processor

Lighthouse can be used to analyze trace and performance data collected from other tools (like WebPageTest and ChromeDriver). The `traces` and `devtoolsLogs` artifact items can be provided using a string for the absolute path on disk. The `devtoolsLogs` array is captured from the `Network` and `Page` domains (a la ChromeDriver's [enableNetwork and enablePage options]((https://sites.google.com/a/chromium.org/chromedriver/capabilities#TOC-perfLoggingPrefs-object)).

As an example, here's a trace-only run that's reporting on user timings and critical request chains:

### `config.json`

```json
{
  "audits": [
    "user-timings",
    "critical-request-chains"
  ],

  "artifacts": {
    "traces": {
      "defaultPass": "/User/me/lighthouse/lighthouse-core/test/fixtures/traces/trace-user-timings.json"
    },
    "devtoolsLogs": {
      "defaultPass": "/User/me/lighthouse/lighthouse-core/test/fixtures/traces/perflog.json"
    }
  },

  "aggregations": [{
    "name": "Performance Metrics",
    "description": "These encapsulate your app's performance.",
    "scored": false,
    "categorizable": false,
    "items": [{
      "audits": {
        "user-timings": { "expectedValue": 0, "weight": 1 },
        "critical-request-chains": { "expectedValue": 0, "weight": 1}
      }
    }]
  }]
}
```

Then, run with: `lighthouse --config-path=config.json http://www.random.url`
