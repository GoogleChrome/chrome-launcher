#!/usr/bin/env bash

# Running:
#     npm run chrome
# or
#     npm explore -g lighthouse -- npm run chrome

# You can also add custom cmd line flags for Chrome:
#     npm run chrome -- --show-paint-rects

CHROME_ARGS=$@

INITIAL_URL="about:blank"
TMP_PROFILE_DIR=$(mktemp -d -t lighthouse.XXXXXXXXXX)
CHROME_FLAGS="--remote-debugging-port=9222 --disable-extensions --disable-translate --user-data-dir=$TMP_PROFILE_DIR --no-first-run $CHROME_ARGS"
CHROME_PATH=""

log_warning() {
  green="\e[38;5;121m"
  reset="\e[0m"
  read -d '' warning << EOF
; Launching Chrome w/ flags from path: $CHROME_PATH
;
; Run Lighthouse from another Terminal tab or window. Ctrl-C here will terminate Chrome
EOF
  printf "%b$warning%b\n\n" "$green" "$reset"
}

launch_osx() {
  LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister
  CHROME_CANARY_PATH=${CHROME_CANARY_PATH:-$($LSREGISTER -dump | grep -i "google chrome canary.app$" | awk '{$1=""; print $0}' | head -n1 | xargs)}
  CHROME_CANARY_EXEC_PATH="${CHROME_CANARY_PATH}/Contents/MacOS/Google Chrome Canary"
  CHROME_PATH="$CHROME_CANARY_PATH"
  log_warning
  if [ ! -f "$CHROME_CANARY_EXEC_PATH" ]; then
    echo "You must install Google Chrome Canary to use lighthouse"
    echo "You can download it from https://www.google.com/chrome/browser/canary.html"
    exit 1
  fi
  "$CHROME_CANARY_EXEC_PATH" $CHROME_FLAGS "$INITIAL_URL"
  rm -r "$TMP_PROFILE_DIR"
}

launch_linux() {
  if [[ x"$LIGHTHOUSE_CHROMIUM_PATH" == x ]]; then
    echo "The environment variable LIGHTHOUSE_CHROMIUM_PATH must be set to executable of a build of Chromium version 52.0 or later."
    echo "If you do not have a recent build of chromium, you can get one from https://download-chromium.appspot.com/"
    exit 1
  fi

  CHROME_PATH="$LIGHTHOUSE_CHROMIUM_PATH"
  log_warning
  "$LIGHTHOUSE_CHROMIUM_PATH" --disable-setuid-sandbox $CHROME_FLAGS "$INITIAL_URL"
  rm -r "$TMP_PROFILE_DIR"
}

if [[ $(uname) == "Darwin" ]]; then
  launch_osx
else
  # Assume a Linux system
  launch_linux
fi
