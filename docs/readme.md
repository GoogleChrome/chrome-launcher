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

### Performance-only Lighthouse run

Many modules consuming Lighthouse are only interested in the performance numbers. 
Lighthouse ships with a [performance-only config](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/perf.json) that you can use:

```js
const perfConfig: any = require('lighthouse/lighthouse-core/config/perf.json');
// ...
launchChromeAndRunLighthouse(url, flags, perfConfig).then( // ...
```

You can also craft your own config (e.g. [plots.json](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/plots.json)) for completely custom runs. Also see the [basic custom audit recipe](https://github.com/GoogleChrome/lighthouse/tree/master/docs/recipes/custom-audit).


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

1. Run `chrome-debug`. This will log the debugging port of your Chrome instance
1. Navigate to your site and log in.
1. In a separate terminal tab, run `lighthouse http://mysite.com --port port-number` using the port number from chrome-debug.

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

  "categories": {
    "performance": {
      "name": "Performance Metrics",
      "description": "These encapsulate your app's performance.",
      "audits": [
        {"id": "user-timings", "weight": 1},
        {"id": "critical-request-chains", "weight": 1}
      ]
    }
  }
}
```

Then, run with: `lighthouse --config-path=config.json http://www.random.url`
