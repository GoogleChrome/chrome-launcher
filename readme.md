# lighthouse
> Stops you crashing into the rocks; lights the way

<p align="center">
<img src="https://cloud.githubusercontent.com/assets/883126/13900813/10a62a14-edcc-11e5-8ad3-f927a592eeb0.png" height="300px">
</p>


[![Build Status](https://travis-ci.org/GoogleChrome/lighthouse.svg?branch=master)](https://travis-ci.org/GoogleChrome/lighthouse)

_status: early. sorta working_

## Running

#### Setup
```sh
npm install

npm link

# Start Chrome with a few flags
npm run chrome
```

#### Run
```sh
# Kick off a lighthouse run
lighthouse
lighthouse https://airhorner.com/

# see flags and options
lighthouse --help
```
 

## Chrome Extension

The same audits are run against from a Chrome extension. See [./extension](https://github.com/GoogleChrome/lighthouse/tree/master/extension).

## Tests

Some basic unit tests forked are in `/test` and run via mocha. eslint is also checked for style violations.

```js
# lint and test all files
npm test

## run linting and unit tests seprately
npm run lint
npm run unit
```

## Architecture

_It's a moving target, but here's a recent attempt at capturing..._

#### Components
* **Driver** - Interfaces with Chrome Debugging Protocol
* **Gathers** - Requesting data from the browser (and maybe post-processing)
* **Artifacts** - The output of gatherers
* **Audits** - Non-performance evaluations of capabilities and issues. Includes a raw value and score of that value.
* **Metrics** - Performance metrics summarizing the UX
* **Diagnoses** - The perf problems that affect those metrics
* **Aggregators** - Pulling audit results, grouping into user-facing components (eg. `install_to_homescreen`) and applying weighting and overall scoring.

### Gatherers

* _Interacting with Chrome:_ The Chrome protocol connection maintained via  [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface) for the CLI and `chrome.debuggger` API when in the Chrome extension. 
* _Reading the DOM:_ We prefer reading the DOM right from the browser (See #77). The driver exposes a `querySelector` method that can be used along with a `getAttribute` method to read values. 

## Code Style

The `.eslintrc` defines all.

#### Code documentation

We're using [JSDoc](http://usejsdoc.org/) along with [closure annotations](https://developers.google.com/closure/compiler/docs/js-for-compiler). Annotations encouraged for all contributions.

#### Variable declarations

`const` > `let` > `var`.  Use `const` wherever possible. Save `var` for emergencies only.

## Trace processing

The traceviewer-based trace processor from [node-big-rig](https://github.com/GoogleChrome/node-big-rig/tree/master/lib) was forked into Lighthouse. Additionally, the [DevTools' Timeline Model](https://github.com/paulirish/devtools-timeline-model) is available as well. There may be advantages for using one model over another.
