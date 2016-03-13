# lighthouse

_status: very early. mostly not working_

## Running audits

Will run the audits defined in the `audits/` folder against a demo app. Chrome protocol connection maintained via  [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface). Start Chrome manually; we can pursue [auto-launching](https://www.npmjs.com/package/chrome-launch) it later.
```sh
# Start Chrome with a few flags
./launch-chrome.sh

# Kick off a lighthouse run

npm start
```

## Tests

Some basic unit tests forked from node-big-rig are in `/test` and run via mocha. eslint is also checked for style violations.

```js
npm test
```

The traceviewer-based trace processor from [node-big-rig](https://github.com/GoogleChrome/node-big-rig/tree/master/lib) was forked into Lighthouse. It's exposed by `lib/processor`. See an example use in the [time-in-javascript](https://github.com/GoogleChrome/lighthouse/blob/85933f07791982d556177fddb55f578d30a4b56f/audits/time-in-javascript/index.js#L43) audit

## Trace processing

The traceviewer-based trace processor from [node-big-rig](https://github.com/GoogleChrome/node-big-rig/tree/master/lib) was forked into Lighthouse. It's exposed by `lib/processor`. See an example use in the [time-in-javascript](https://github.com/GoogleChrome/lighthouse/blob/85933f07791982d556177fddb55f578d30a4b56f/audits/time-in-javascript/index.js#L43) audit
