/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

export const DEFAULT_FLAGS = [
  // Disable all chrome extensions entirely
  '--disable-extensions',
  // Disable various background network services, including extension updating,
  //   safe browsing service, upgrade detector, translate, UMA
  '--disable-background-networking',
  // Disable fetching safebrowsing lists. Otherwise requires a 500KB download immediately after launch.
  //   This flag is likely redundant due to disable-background-networking
  '--safebrowsing-disable-auto-update',
  // Disable built-in Google Translate service
  '--disable-translate',
  // Disable syncing to a Google account
  '--disable-sync',
  // Disable reporting to UMA, but allows for collection
  '--metrics-recording-only',
  // Disable installation of default apps on first run
  '--disable-default-apps',
  // Mute any audio
  '--mute-audio',
  // Skip first run wizards
  '--no-first-run',

  // Disable timers being throttled in background pages/tabs
  '--disable-background-timer-throttling',
  // Disables client-side phishing detection. Likely redundant due to the safebrowsing disable
  '--disable-client-side-phishing-detection',
  // Disable popup blocking
  '--disable-popup-blocking',
  // Reloading a page that came from a POST normally prompts the user.
  '--disable-prompt-on-repost',
  // Disable the a few things considered not appropriate for automation, e.g. infobar animations, password saving UI
  //   https://docs.google.com/a/google.com/document/d/1JYj9K61UyxIYavR8_HATYIglR9T_rDwAtLLsD3fbDQg/preview
  '--enable-automation',
  // Avoid potential instability of using Gnome Keyring or KDE wallet. crbug.com/571003
  '--password-store=basic',
  // Use mock keychain on Mac to prevent blocking permissions dialogs
  '--use-mock-keychain',
];
