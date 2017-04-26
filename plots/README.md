# Lighthouse Metrics Analysis

Online at https://googlechrome.github.io/lighthouse/plots/

For context and roadmap, please see issue:
https://github.com/GoogleChrome/lighthouse/issues/1924

## Workflow

### Setup

You need to build lighthouse first.

### Generating & viewing charts

```
# View all commands
$ cd plots
$ yarn run

# Run lighthouse to collect metrics data
$ yarn measure

# Analyze the data to generate a summary file (i.e. out/generatedResults.js)
# This will launch the charts web page in the browser
$ yarn analyze

# If you need to view the charts later
$ yarn open
```
