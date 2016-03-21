### Install dogfood extension

* chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk

### Dev

* `npm i && bower i`
* `npm run watch`
* Load `/app` as Unpacked extension.


## Deploy

* Be in lighthouse-extension-owners group
* `npm run build`
* Verify that the extension in `dist` works.
* Verify that `dist/package.json` bumps the version number vs what's on CWS.
* `gulp package`
* Open [https://chrome.google.com/webstore/developer/dashboard](https://chrome.google.com/webstore/developer/dashboard)
* Click _Edit_ on lighthouse
* _Upload Updated Package_
* Select `packages/lighthouse-0.X.X.zip`
* _Publish_ at the bottom

## deploy via chrome app
(This appears to be broken, unfortunately.)
* Install [web store api app](https://chrome.google.com/webstore/detail/web-store-api-sample-app/ndgidogppopohjpghapeojgoehfmflab)
  * Add dist folder
* `npm run build`
* Use ID: `blipmdconlkpinefehnmjammfjpmpbjk`
