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

If you have a contribution for our [documentation](https://developers.google.com/web/tools/lighthouse/), please submit it in the [WebFundamentals repo](https://github.com/google/WebFundamentals/tree/master/src/content/en/tools/lighthouse).

1. Submit an issue describing your proposed change to the repo in question.
1. The repo owner will respond to your issue promptly.
1. If your proposed change is accepted, and you haven't already done so, sign a Contributor License Agreement (see details above).
1. Fork the repo, develop and test your code changes.
1. Ensure that your code adheres to the existing style in the sample to which you are contributing.
1. Submit a pull request.

## helpText guidelines

Keep the `helpText` of an audit as short as possible. When a reference doc for the audit exists on
developers.google.com/web, the `helpText` should only explain *why* the user should care
about the audit, not *how* to fix it.

Do:

    Serve images that are smaller than the user's viewport to save cellular data and
    improve load time. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/oversized-images).

Don't:

    Serve images that are smaller than the user's viewport to save cellular data and
    improve load time. Consider using responsive images and client hints.

If no reference doc exists yet, then you can use the `helpText` as a stopgap for explaining
both why the audit is important and how to fix it.

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
lighthouse --perf "chrome://version"
yarn smoke
echo "Test the extension"

echo "Test a fresh local install"
# (starting from lighthouse root...)
# cd ..; mkdir tmp; cd tmp
# npm install ../lighthouse
# npm explore lighthouse -- npm run smoke
# npm explore lighthouse -- npm run smokehouse
# npm explore lighthouse -- npm run chrome # try the manual launcher
# npm explore lighthouse -- npm run fast -- http://example.com
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

echo "Verify the npm package won't include unncessary files"
yarn global add irish-pub pkgfiles
irish-pub; pkgfiles;  

echo "ship it"
npm publish
yarn deploy-viewer

echo "Use the GitHub web interface to tag the release"
echo "Generate the release notes, and update the release page"

# * Tell the world!!! *
echo "Inform various peoples"
```

### Canary release

```sh
# Pull latest in a clean non-dev clone.

yarn install-all

# Update manifest_canary.json w/ version bumps.

# branch and commit
git commmit -m "bump extension canary to 2.0.0.X"

npm version prerelease # this will commit


# overwrite extension's manifest w/ manifest_canary.

yarn build-all

cd lighthouse-extension/
gulp package
# upload zip to CWS and publish

# verify you build-all'd for the typescript compile
# ...

# publish to canary tag!
npm publish --tag canary
```
