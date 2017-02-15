# Architecture

_Some incomplete notes_

## Components

* **Driver** - Interfaces with [Chrome Debugging Protocol](https://developer.chrome.com/devtools/docs/debugger-protocol)  ([API viewer](https://chromedevtools.github.io/debugger-protocol-viewer/))
* **Gatherers** - Requesting data from the browser (and maybe post-processing)
* **Artifacts** - The output of gatherers
* **Audits** - Non-performance evaluations of capabilities and issues. Includes a raw value and score of that value.
* **Metrics** - Performance metrics summarizing the UX
* **Aggregations** - Pulling audit results, grouping into user-facing components (eg. `install_to_homescreen`) and applying weighting and overall scoring.

### Internal module graph

![graph of lighthouse-core module dependencies](https://cloud.githubusercontent.com/assets/39191/19367685/04d4336a-9151-11e6-9ebb-3b87bdb09a4c.png)

`npm install -g js-vd; vd --exclude "node_modules|third_party|fs|path|url|log" lighthouse-core/ > graph.html`

## Protocol

* _Interacting with Chrome:_ The Chrome protocol connection maintained via [WebSocket](https://github.com/websockets/ws) for the CLI [`chrome.debuggger` API](https://developer.chrome.com/extensions/debugger) when in the Chrome extension.
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

## Gatherers

* _Reading the DOM:_ We prefer reading the DOM right from the browser (See #77). The driver exposes a `querySelector` method that can be used along with a `getAttribute` method to read values.

## Audits

The return value of each audit takes this shape:

```js
Promise.resolve({
  name: 'audit-name',
  description: 'whatnot',
  // value: The score. Typically a boolean, but can be number 0-100
  value: 0,
  // rawValue: Could be anything, as long as it can easily be stringified and displayed,
  //   e.g. 'your score is bad because you wrote ${rawValue}'
  rawValue: {},
  // debugString: Some *specific* error string for helping the user figure out why they failed here.
  //   The reporter can handle *general* feedback on how to fix, e.g. links to the docs
  debugString: 'Your manifest 404ed',
});
```
