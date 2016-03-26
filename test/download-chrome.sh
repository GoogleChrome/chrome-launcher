#!/usr/bin/env bash

# Download chrome inside of our CI env.

chromepath=chrome-linux/chrome
if [ -e "$chromepath" ]
then
  echo "cached chrome found"
else
  wget 'https://download-chromium.appspot.com/dl/Linux_x64?type=continuous' -O chrome.zip && unzip chrome.zip
fi
