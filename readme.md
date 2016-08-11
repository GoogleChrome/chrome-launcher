# lighthouse
> Stops you crashing into the rocks; lights the way

![image](https://cloud.githubusercontent.com/assets/39191/15410166/30c658e2-1dcd-11e6-99da-8996be5429b6.png)

![image](https://cloud.githubusercontent.com/assets/39191/15410190/502b2d52-1dcd-11e6-9d82-5de8742180bd.png)



[![Build Status](https://travis-ci.org/GoogleChrome/lighthouse.svg?branch=master)](https://travis-ci.org/GoogleChrome/lighthouse)
[![Coverage Status](https://coveralls.io/repos/github/GoogleChrome/lighthouse/badge.svg?branch=master)](https://coveralls.io/github/GoogleChrome/lighthouse?branch=master)

_status: prototype extension and CLI available for testing_

## Install Chrome extension

Requires Chrome version 52+

[chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk](https://chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk)

## Install CLI

Requires Node v5+ or Node v4 w/ `--harmony`

```sh
npm install -g GoogleChrome/lighthouse
```

## Run
```sh
# Start Chrome with a few flags
npm explore -g lighthouse -- npm run chrome

# Kick off a lighthouse run
lighthouse https://airhorner.com/

# see flags and options
lighthouse --help
```

## Develop

#### Setup
```sh
git clone https://github.com/GoogleChrome/lighthouse
cd lighthouse

# will be cleaner soon.
cd lighthouse-core
npm install
```

## Custom run configuration

You can supply your own run configuration to customize what audits you want details on. Copy the [default.json](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/default.json) and start customizing. Then provide to the CLI with `lighthouse --config-path=$PWD/myconfig.json <url>`

## Trace processing

Lighthouse can be used to analyze trace and performance data collected from other tools (like WebPageTest and ChromeDriver). The `traces` and `performanceLog` artifact items can be provided using a string for the absolute path on disk. The perf log is captured from the Network domain (a la ChromeDriver's [`enableNetwork` option](https://sites.google.com/a/chromium.org/chromedriver/capabilities#TOC-perfLoggingPrefs-object) and reformatted slightly. As an example, here's a trace-only run that's reporting on user timings and critical request chains:

##### `config.json`
```js
{
  "audits": [
    "user-timings",
    "critical-request-chains"
  ],

  "artifacts": {
    "traces": {
      "defaultPass": "/User/me/lighthouse/lighthouse-core/test/fixtures/traces/trace-user-timings.json"
    },
    "performanceLog": "/User/me/lighthouse/lighthouse-core/test/fixtures/traces/perflog.json"
  },

  "aggregations": [{
    "name": "Performance Metrics",
    "description": "These encapsulate your app's performance.",
    "scored": false,
    "categorizable": false,
    "items": [{
      "criteria": {
        "user-timings": { "rawValue": 0, "weight": 1 },
        "critical-request-chains": { "rawValue": 0, "weight": 1}
      }
    }]
  }]
}
```

Then, run with: `lighthouse --config-path=$PWD/config.json http://www.random.url`


## Lighthouse CLI options

```sh
$ lighthouse --help

lighthouse <url>

Logging:
  --verbose  Displays verbose logging                                                 [boolean]
  --quiet    Displays no progress or debug logs                                       [boolean]

Configuration:
  --mobile                 Emulates a Nexus 5X                                  [default: true]
  --load-page              Loads the page                                       [default: true]
  --save-assets            Save the trace contents & screenshots to disk              [boolean]
  --save-artifacts         Save all gathered artifacts to disk                        [boolean]
  --audit-whitelist        Comma separated list of audits to run               [default: "all"]
  --list-all-audits        Prints a list of all available audits and exits            [boolean]
  --list-trace-categories  Prints a list of all required trace categories and exits   [boolean]
  --config-path            The absolute path to the config JSON.

Output:
  --output       Reporter for the results
                         [choices: "pretty", "json", "html"]                [default: "pretty"]
  --output-path  The file path to output the results
                 Example: --output-path=./lighthouse-results.html           [default: "stdout"]

Options:
  --help     Show help                                                                [boolean]
  --version  Show version number                                                      [boolean]
```

## Tests

Some basic unit tests forked are in `/test` and run via mocha. eslint is also checked for style violations.

```js
# lint and test all files
npm test

# watch for file changes and run tests
#   Requires http://entrproject.org : brew install entr
npm run watch

## run linting and unit tests seprately
npm run lint
npm run unit
```

## Chrome Extension

The same audits are run against from a Chrome extension. See [./extension](https://github.com/GoogleChrome/lighthouse/tree/master/lighthouse-extension).


## Architecture

_Some incomplete notes_

#### Components
* **Driver** - Interfaces with [Chrome Debugging Protocol](https://developer.chrome.com/devtools/docs/debugger-protocol)  ([API viewer](https://chromedevtools.github.io/debugger-protocol-viewer/))
* **Gathers** - Requesting data from the browser (and maybe post-processing)
* **Artifacts** - The output of gatherers
* **Audits** - Non-performance evaluations of capabilities and issues. Includes a raw value and score of that value.
* **Metrics** - Performance metrics summarizing the UX
* **Diagnoses** - The perf problems that affect those metrics
* **Aggregators** - Pulling audit results, grouping into user-facing components (eg. `install_to_homescreen`) and applying weighting and overall scoring.

##### Internal module graph
![graph of lighthouse-core module dependencies](https://cloud.githubusercontent.com/assets/39191/16702446/cd59989e-451a-11e6-97e9-6c72c301017d.png)
<small><code>npm install -g js-vd; vd --exclude "node_modules|third_party" lighthouse-core/ > graph.html</code></small>


### Protocol

* _Interacting with Chrome:_ The Chrome protocol connection maintained via  [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface) for the CLI and [`chrome.debuggger` API](https://developer.chrome.com/extensions/debugger) when in the Chrome extension.
* _Event binding & domains_: Some domains must be `enable()`d so they issue events. Once enabled, they flush any events that represent state. As such, network events will only issue after the domain is enabled. All the protocol agents resolve their `Domain.enable()` callback _after_ they have flushed any pending events. See example:

```js
// will NOT work
driver.sendCommand('Security.enable').then(_ => {
	driver.on('Security.securityStateChanged', state => { /* ... */ });
})

// WILL work! happy happy. :)
driver.on('Security.securityStateChanged', state => { /* ... */ }); // event binding is synchronous
driver.sendCommand('Security.enable');
```
* _Debugging the protocol_: Read [Better debugging of the Protocol](https://github.com/GoogleChrome/lighthouse/issues/184).

### Gatherers

* _Reading the DOM:_ We prefer reading the DOM right from the browser (See #77). The driver exposes a `querySelector` method that can be used along with a `getAttribute` method to read values.

### Audits

The return value of each audit takes this shape:

```js
Promise.resolve({
  name: 'audit-name',
  tags: ['what have you'],
  description: 'whatnot',
  // value: The score. Typically a boolean, but can be number 0-100
  value: 0,
  // rawValue: Could be anything, as long as it can easily be stringified and displayed,
  //   e.g. 'your score is bad because you wrote ${rawValue}'
  rawValue: {},
  // debugString: Some *specific* error string for helping the user figure out why they failed here.
  //   The reporter can handle *general* feedback on how to fix, e.g. links to the docs
  debugString: 'Your manifest 404ed'
  // fault:  Optional argument when the audit doesn't cover whatever it is you're doing,
  //   e.g. we can't parse your particular corner case out of a trace yet.
  //   Whatever is in `rawValue` and `score` would be N/A in these cases
  fault: 'some reason the audit has failed you, Anakin'
});
```

## Code Style

The `.eslintrc` defines all.

We're using [JSDoc](http://usejsdoc.org/) along with [closure annotations](https://developers.google.com/closure/compiler/docs/js-for-compiler). Annotations encouraged for all contributions.

`const` > `let` > `var`.  Use `const` wherever possible. Save `var` for emergencies only.

## Trace processing

The traceviewer-based trace processor from [node-big-rig](https://github.com/GoogleChrome/node-big-rig/tree/master/lib) was forked into Lighthouse. Additionally, the [DevTools' Timeline Model](https://github.com/paulirish/devtools-timeline-model) is available as well. There may be advantages for using one model over another.

**To update traceviewer source:**

```sh
cd lighthouse-core
# if not already there, clone catapult and copy license over
git clone --depth=1 https://github.com/catapult-project/catapult.git third_party/src/catapult
cp third_party/src/catapult/LICENSE third_party/traceviewer-js/
# pull for latest
git -C "./third_party/src/catapult/" pull
# run our conversion script
node scripts/build-traceviewer-module.js
```


<p align="center">
<img src="https://cloud.githubusercontent.com/assets/883126/13900813/10a62a14-edcc-11e5-8ad3-f927a592eeb0.png" height="300px">
</p>
