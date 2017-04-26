# Lighthouse Extension

## Install dogfood extension

* <https://chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk>

(If the warning bar about the connected debugging agent bothers you, it can be disabled at `chrome://flags/#silent-debugger-extension-api`)

## Dev

* `npm i`
* `yarn watch`
* Load `/app` as Unpacked extension.
* Saved changes _should_ trigger a recompile followed by browsersync automatically refreshing the extension.
* Scripts in `./app/src/` are browserified into `./app/scripts`.

## Manual Deploy to CWS

* Be in lighthouse-extension-owners group
* `yarn build`
* Verify that the extension in `dist` works.
* Verify that `dist/manifest.json` bumps the version number vs what's on CWS.
* `gulp package`
* Open <https://chrome.google.com/webstore/developer/dashboard>
* Click _Edit_ on lighthouse
* _Upload Updated Package_
* Select `packages/lighthouse-1.X.X.zip`
* _Publish_ at the bottom

## ~~Easier Deploy via API~~

(This appears to be broken, unfortunately…)

* Install [web store api app](https://chrome.google.com/webstore/detail/web-store-api-sample-app/ndgidogppopohjpghapeojgoehfmflab)
  * Add dist folder
* `yarn build`
* Use ID: `blipmdconlkpinefehnmjammfjpmpbjk`
