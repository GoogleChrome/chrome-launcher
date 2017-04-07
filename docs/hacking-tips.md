A few assorted scripts and tips to make hacking on Lighthouse a bit easier

## Unhandled promise rejections

Getting errors like these?

> (node:12732) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1)
> (node:12732) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.

Use [`--trace-warnings`](https://medium.com/@jasnell/introducing-process-warnings-in-node-v6-3096700537ee) to get actual stack traces.

```sh
node --trace-warnings lighthouse-cli http://example.com
```

## Updating fixture dumps

`lighthouse-core/test/results/samples_v2.json` is generated from running LH against
dbw_tester.html. To update this file, run:

```sh
npm run start -- --output=json --output-path=lighthouse-core/test/results/sample_v2.json http://localhost:8080/dobetterweb/dbw_tester.html
```

After updating, consider deleting any irrelevant changes from the diff (exact timings, timestamps, etc). Be sure to run the tests.

## Iterating on the v2 report

This will generate new reports from the same results json.

```sh
# capture some results first:
lighthouse --output=json http://example.com > temp.report.json

# quickly generate reports:
node generate_report_v2.js > temp.report.html; open temp.report.html
```
```js
// generate_report_v2.js
'use strict';

const ReportGeneratorV2 = require('./lighthouse-core/report/v2/report-generator');
const results = require('./temp.report.json');
const html = new ReportGeneratorV2().generateReportHtml(results);

console.log(html);
```

## Iterating on the v1 report

```sh
node generate_report.js > temp.report.html; open temp.report.html
```

```js
// generate_report.js
'use strict';

const ReportGenerator = require('./lighthouse-core/report/report-generator');
const results = require('./lighthouse-core/test/results/sample.json');
const reportGenerator = new ReportGenerator();
const html = reportGenerator.generateHTML(results, 'devtools');

console.log(html);
```

