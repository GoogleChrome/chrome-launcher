# Lighthouse objects & options



# Running headless Chrome for Lighthouse

The headless_shell still has a few bugs to work out. Until then, Chrome + xvfb is a stable solution.
These steps mostly worked on Debian Jessie. Also, worth a look: both `.travis.yml` and `launch-chrome.sh`.

```sh
# get node 6
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs

# get chromium (stable) and Xvfb
apt-get install chromium-browser xvfb

# install lighthouse
git clone https://github.com/GoogleChrome/lighthouse
cd lighthouse && npm i && npm link
```

```sh

# start up chromium inside xvfb
xvfb-run --server-args='-screen 0, 1024x768x16' chromium-browser  --temp-profile --start-maximized --no-first-run  --remote-debugging-port=9222 "about:blank"

# kick off your lighthouse run, saving assets to verify for later
lighthouse http://github.com --save-assets
```
