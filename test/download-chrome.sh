#!/usr/bin/env bash

# Download chrome inside of our CI env.

if [ x"$LIGHTHOUSE_CHROMIUM_PATH" == x ]
then
    echo "Error: Environment variable LIGHTHOUSE_CHROMIUM_PATH not set"
    exit 1
fi

if [ -e "$LIGHTHOUSE_CHROMIUM_PATH" ]
then
  echo "cached chrome found"
else
  wget 'https://download-chromium.appspot.com/dl/Linux_x64?type=snapshots' -O chrome.zip && unzip chrome.zip
fi
