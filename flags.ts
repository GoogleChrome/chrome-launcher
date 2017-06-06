/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

export const DEFAULT_FLAGS = [
  // Disable built-in Google Translate service
  '--disable-translate',
  // Disable all chrome extensions entirely
  '--disable-extensions',
  // Disable various background network services, including extension updating,
  //   safe browsing service, upgrade detector, translate, UMA
  '--disable-background-networking',
  // Disable fetching safebrowsing lists, likely redundant due to disable-background-networking
  '--safebrowsing-disable-auto-update',
  // Disable syncing to a Google account
  '--disable-sync',
  // Disable reporting to UMA, but allows for collection
  '--metrics-recording-only',
  // Disable installation of default apps on first run
  '--disable-default-apps',
  // Skip first run wizards
  '--no-first-run',
];
