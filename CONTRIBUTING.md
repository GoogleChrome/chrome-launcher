# For Contributors

We'd love your help! This doc covers how to become a contributor and submit code to the project.

## Follow the coding style

The `.eslintrc` defines all. We use [JSDoc](http://usejsdoc.org/) along with [closure annotations](https://developers.google.com/closure/compiler/docs/js-for-compiler). Annotations encouraged for all contributions.

## Learn about the architecture

See [Lighthouse Architecture](./docs/architecture.md), our overview and tour of the codebase.

## Sign the Contributor License Agreement

We'd love to accept your sample apps and patches! Before we can take them, we have to jump a couple of legal hurdles.

Please fill out either the individual or corporate Contributor License Agreement (CLA).

* If you are an individual writing original source code and you're sure you own the intellectual property, then you'll need to sign an [individual CLA](https://developers.google.com/open-source/cla/individual).
* If you work for a company that wants to allow you to contribute your work, then you'll need to sign a [corporate CLA](https://developers.google.com/open-source/cla/corporate).

Follow either of the two links above to access the appropriate CLA and instructions for how to sign and return it. Once we receive it, we'll be able to
accept your pull requests.

## Contributing a patch

1. Submit an issue describing your proposed change to the repo in question.
1. The repo owner will respond to your issue promptly.
1. If your proposed change is accepted, and you haven't already done so, sign a Contributor License Agreement (see details above).
1. Fork the repo, develop and test your code changes.
1. Ensure that your code adheres to the existing style in the sample to which you are contributing.
1. Submit a pull request.

# For Maintainers

## Updating traceviewer source

```sh
cd lighthouse-core
# if not already there, clone catapult and copy license over
git clone --depth=1 https://github.com/catapult-project/catapult.git third_party/src/catapult
cp third_party/src/catapult/LICENSE third_party/traceviewer-js/
# pull for latest
git -C "./third_party/src/catapult/" pull
# run our conversion script
node scripts/build-traceviewer-module.js
```

## Release guide

```sh
# * Install the latest. This also builds the cli, extension, and viewer *
yarn
yarn install-all
yarn build-all

# * Bump it *
echo "Bump the versions in extension/app/manifest.json and package.json"

# * Test err'thing *
echo "Test the CLI."
yarn run smoke
echo "Test the extension"

echo "Test a fresh local install"
# (starting from lighthouse root...)
# cd ..; mkdir tmp; cd tmp
# npm install ../lighthouse
# npm explore lighthouse -- npm run smoke
# npm explore lighthouse -- npm run smokehouse
# npm explore lighthouse -- npm run chrome # try the manual launcher
# cd ..; rm -rf ./tmp;

echo "Test the lighthouse-viewer build"
# Manual test for now:
# Start a server in lighthouse-viewer/dist/ and open the page in a tab. You should see the viewer.
# Drop in a results.json or paste an existing gist url (e.g. https://gist.github.com/ebidel/b9fd478b5f40bf5fab174439dc18f83a).
# Check for errors!

# * Put up the PR *
echo "Branch and commit the version bump."
echo "Generate a PR and get it merged."

# * Deploy-time *
cd lighthouse-extension; yarn build; gulp package; cd ..
echo "Upload the package zip to CWS dev dashboard"

npm publish
yarn run deploy-viewer

echo "Use the GitHub web interface to tag the release"
echo "Generate the release notes, and update the release page"

# * Tell the world!!! *
echo "Inform various peoples"
```
