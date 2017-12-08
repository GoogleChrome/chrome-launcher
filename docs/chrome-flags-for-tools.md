Many tools maintain a list of runtime flags for Chrome to configure the environment. This file
is an attempt to document all chrome flags that are relevant to tools, automation, benchmarking, etc.

All use cases are different, so you'll have to choose which flags are most appropriate.

## Flags

### `--disable-extensions`
Disable all chrome extensions entirely

### `--disable-background-networking`
Disable various background network services, including extension updating,
safe browsing service, upgrade detector, translate, UMA

### `--safebrowsing-disable-auto-update`
Disable fetching safebrowsing lists. Otherwise requires a 500KB download immediately after launch.
This flag is likely redundant if disable-background-networking is on

### `--disable-translate`
Disable built-in Google Translate service

### `--disable-sync`
Disable syncing to a Google account

### `--metrics-recording-only`
Disable reporting to UMA, but allows for collection

### `--disable-default-apps`
Disable installation of default apps on first run

### `--mute-audio`
Mute any audio

### `--no-first-run`
Skip first run wizards

### `--disable-background-timer-throttling`
Disable timers being throttled in background pages/tabs

### `--disable-client-side-phishing-detection`
Disables client-side phishing detection. Likely redundant due to the safebrowsing disable

### `--disable-popup-blocking`
Disable popup blocking

### `--disable-prompt-on-repost`
Reloading a page that came from a POST normally prompts the user.

### `--enable-automation`
Disable a few things considered not appropriate for automation. ([Original design doc](https://docs.google.com/a/google.com/document/d/1JYj9K61UyxIYavR8_HATYIglR9T_rDwAtLLsD3fbDQg/preview)) [codesearch](https://cs.chromium.org/search/?q=kEnableAutomation&type=cs)

* disables the password saving UI (which covers the usecase of the [removed](https://bugs.chromium.org/p/chromedriver/issues/detail?id=1015) `--disable-save-password-bubble` flag)
* disables infobar animations
* disables dev mode extension bubbles (?), and doesn't show some other info bars
* means the default browser check prompt isn't shown
* avoids showing these 3 infobars: ShowBadFlagsPrompt, GoogleApiKeysInfoBarDelegate, ObsoleteSystemInfoBarDelegate
* adds this infobar:

![image](https://user-images.githubusercontent.com/39191/30349667-92a7a086-97c8-11e7-86b2-1365e3d407e3.png)

### `--password-store=basic`
Avoid potential instability of using Gnome Keyring or KDE wallet. crbug.com/571003

### `--use-mock-keychain`
Use mock keychain on Mac to prevent blocking permissions dialogs

### `--test-type`
Basically the 2014 version of `--enable-automation`. [codesearch](https://cs.chromium.org/search/?q=kTestType%5Cb&type=cs)

* It avoids creating application stubs in ~/Applications on mac.
* It makes exit codes slightly more correct
* windows navigation jumplists arent updated https://bugs.chromium.org/p/chromium/issues/detail?id=389375
* doesn't start some chrome StartPageService
* disables initializing chromecast service
* "Component extensions with background pages are not enabled during tests because they generate a lot of background behavior that can interfere."
* when quitting the browser, it disables additional checks that may stop that quitting process. (like unsaved form modifications or unhandled profile notifications..)

### `--disable-browser-side-navigation`
Disable PlzNavigate.

## Flags to triage

These flags are being used in various tools. They also just need to be documented with their effects and confirmed as still present in Chrome.

```sh
--no-default-browser-check
--process-per-tab
--new-window
--silent-debugger-extension-api
--disable-notifications
--disable-desktop-notifications
--allow-running-insecure-content
--disable-component-update
--disable-background-downloads
--disable-add-to-shelf
--disable-datasaver-prompt
--disable-domain-reliability
```

## Sources

* [chrome-launcher's flags](https://github.com/GoogleChrome/chrome-launcher/blob/master/flags.ts)
* [Chromedriver's flags](https://cs.chromium.org/chromium/src/chrome/test/chromedriver/chrome_launcher.cc?type=cs&q=f:chrome_launcher++kDesktopSwitches&sq=package:chromium)
* [Puppeteer's flags](https://github.com/GoogleChrome/puppeteer/blob/master/lib/Launcher.js)
* [WebpageTest's flags](https://github.com/WPO-Foundation/webpagetest/blob/master/agent/wptdriver/web_browser.cc)

## All Chrome flags
* [Peter.sh's canonical list of Chrome command-line switches](http://peter.sh/experiments/chromium-command-line-switches/)