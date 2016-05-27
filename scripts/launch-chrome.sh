#!/usr/bin/env bash

CHROME_ARGS=$@

launch_osx() {
  LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister
  CHROME_CANARY_PATH=${CHROME_CANARY_PATH:-$($LSREGISTER -dump | grep -i "google chrome canary.app$" | awk '{$1=""; print $0}' | head -n1 | xargs)}
  CHROME_CANARY_EXEC_PATH="${CHROME_CANARY_PATH}/Contents/MacOS/Google Chrome Canary"
  echo "Using Chrome Canary from path ${CHROME_CANARY_PATH}"
  if [ ! -f "$CHROME_CANARY_EXEC_PATH" ]; then
    echo "You must install Google Chrome Canary to use lighthouse"
    echo "You can download it from https://www.google.com/chrome/browser/canary.html"
    exit 1
  fi
  TMP_PROFILE_DIR=$(mktemp -d -t lighthouse)
  "$CHROME_CANARY_EXEC_PATH" \
    --remote-debugging-port=9222 \
    --no-first-run \
    --user-data-dir=$TMP_PROFILE_DIR \
    $CHROME_ARGS \
    "about:blank"
  rm -r $TMP_PROFILE_DIR
}

launch_linux() {
  if [[ x"$LIGHTHOUSE_CHROMIUM_PATH" == x ]]; then
    echo "The environment variable LIGHTHOUSE_CHROMIUM_PATH must be set to executable of a build of Chromium version 52.0 or later."
    echo "If you do not have a recent build of chromium, you can get one from https://download-chromium.appspot.com/"
    exit 1
  fi

  TMP_PROFILE_DIR=$(mktemp -d -t lighthouse.XXXXXXXXXX)
  echo "Launching Google Chrome from $LIGHTHOUSE_CHROMIUM_PATH"
  "$LIGHTHOUSE_CHROMIUM_PATH" \
    --disable-setuid-sandbox \
    --remote-debugging-port=9222 \
    --no-first-run \
    --user-data-dir=$TMP_PROFILE_DIR \
    $CHROME_ARGS \
    "about:blank"
  rm -r $TMP_PROFILE_DIR
}


if [[ $(uname) == "Darwin" ]]; then
  launch_osx
else
  # Assume a Linux system
  launch_linux
fi
