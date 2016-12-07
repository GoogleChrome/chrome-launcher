## Lighthouse Viewer

### Development

* `npm i`
*  Build: `gulp`, Watch: `gulp watch`

For development, `gulp watch` will browserify `dist/src/main.js` and create a
runnable script in all modern browsers. Use this for quick iterations when developing.

For production, run `gulp`. This compiles and minifies `dist/src/main.js` using Closure.

### Deploy

Deploys should be done as part of the Lighthouse release process. To update GH pages,
run the following in the root folder of a Lighthouse checkout:

    npm run deploy-viewer

This builds `lighthouse-viewer/dist/src/main.js` and pushes the contents of `dist`
to the `gh-pages` branch.
