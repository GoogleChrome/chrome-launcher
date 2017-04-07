# Lighthouse Metrics Analysis

For context and roadmap, please see issue:
https://github.com/GoogleChrome/lighthouse/issues/1924

## Workflow

### Setup

You need to build lighthouse first.

### Commands

```
# View all commands
$ cd plots
$ npm run

# Run lighthouse to collect metrics data
$ npm run measure

# Analyze the data to generate a summary file (i.e. out/generatedResults.js)
$ npm run analyze

# View visualization
# Open index.html in browser
```