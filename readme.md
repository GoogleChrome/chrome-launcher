# lighthouse

_status: very early. mostly not working_

## running audits 

Will run the audits defined in the `tests/` folder against a demo app. Will launch and control via chromedriver.
```sh
node .
```


## running processor on a trace.

The processor from [node-big-rig](https://github.com/GoogleChrome/node-big-rig/tree/master/lib) is integrated directly here. It's currently exposed as `getTrace` in [`driver.js`](https://github.com/GoogleChrome/big-rig/blob/tests/helpers/browser/driver.js#L84).
The [time-in-javascript](https://github.com/GoogleChrome/big-rig/blob/tests/tests/time-in-javascript/index.js) audit uses this.  

You can also use it directly. (I think)
```js
var processor = require('./lib/processor');
var model = processor.analyzeTrace(traceContents, opts);
```

