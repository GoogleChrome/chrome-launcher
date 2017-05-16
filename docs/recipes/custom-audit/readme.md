# Basic custom audit recipe for Lighthouse

A hypothetical site measures the time from navigation start to when the page has initialized and the main search box is ready to be used. It saves that value in a global variable, `window.myLoadMetrics.searchableTime`.

This Lighthouse [gatherer](searchable-gatherer.js)/[audit](searchable-audit.js) pair will take that value from the context of the page and test whether or not it stays below a test threshold.

The config file tells Lighthouse where to find the gatherer and audit files, when to run them, and how to incorporate their output into the Lighthouse report.

## Run
With site running:
`lighthouse --config-path=custom-config.js https://test-site.url`
