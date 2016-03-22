# lighthouse

<p align="center">
<img src="https://cloud.githubusercontent.com/assets/883126/13900813/10a62a14-edcc-11e5-8ad3-f927a592eeb0.png" height="300px">
</p>


[![Build Status](https://travis-ci.org/GoogleChrome/lighthouse.svg?branch=master)](https://travis-ci.org/GoogleChrome/lighthouse)

_status: very early. mostly not working_

## Running audits

Will run the audits defined in the `audits/` folder against a demo app. Chrome protocol connection maintained via  [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface). Start Chrome manually; we can pursue [auto-launching](https://www.npmjs.com/package/chrome-launch) it later.
```sh
# Start Chrome with a few flags
./launch-chrome.sh

# set up the global
npm link

# Kick off a lighthouse run
lighthouse
lighthouse https://airhorner.com/
```

## Chrome Extension

See [./extension](https://github.com/GoogleChrome/lighthouse/tree/master/extension).

## Tests

Some basic unit tests forked are in `/test` and run via mocha. eslint is also checked for style violations.

```js
npm test
```

### Code Style

The `.eslintrc` defines all.

#### Variable declarations

`const` > `let` > `var`.  Use `const` wherever possible. Save `var` for emergencies only.


## Trace processing

The traceviewer-based trace processor from [node-big-rig](https://github.com/GoogleChrome/node-big-rig/tree/master/lib) was forked into Lighthouse. Additionally, the [DevTools' Timeline Model](https://github.com/paulirish/devtools-timeline-model) is available as well. There may be advantages for using one model over another.

