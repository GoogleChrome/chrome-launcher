# Architecture

_Some incomplete notes_

![Lighthouse Architecture](https://raw.githubusercontent.com/GoogleChrome/lighthouse/master/assets/architecture.jpg)

## Components & Terminology

* **Driver** - Interfaces with [Chrome Debugging Protocol](https://developer.chrome.com/devtools/docs/debugger-protocol)  ([API viewer](https://chromedevtools.github.io/debugger-protocol-viewer/))
* **Gatherers** - Uses Driver to collect information about the page. Minimal post-processing.
  * **Artifacts** - output of a gatherer
* **Audits** - Using the Artifacts as input, Audits evaluate a test and assign pass/fail/scoring.
  * **Computed Artifacts** - Generated on-demand from artifacts, these add additional meaning, and are often shared amongst multiple audits.
* **Categories** - Grouping audit results into a user-facing section of the report (eg. `Best Practices`). Applies weighting and overall scoring to the section.

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

## Audits

The return value of each audit [takes this shape](https://github.com/GoogleChrome/lighthouse/blob/b354890076f2c077c5460b2fa56ded546cca72ee/lighthouse-core/closure/typedefs/AuditResult.js#L23-L55).

The `details` object is parsed in report-renderer.js. View other audits for guidance on how to structure `details`.
