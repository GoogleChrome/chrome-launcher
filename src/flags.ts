/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * See the following `chrome-flags-for-tools.md` for exhaustive coverage of these and related flags
 * @url https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md 
 */

export const DEFAULT_FLAGS: ReadonlyArray<string> = [
  '--disable-features=' +
      [
        // Disable built-in Google Translate service
        'Translate',
        // Disable the Chrome Optimization Guide background networking
        'OptimizationHints',
        //  Disable the Chrome Media Router (cast target discovery) background networking
        'MediaRouter',
        /// Avoid the startup dialog for _Do you want the application “Chromium.app” to accept incoming network connections?_. This is a sub-component of the MediaRouter.
        'DialMediaRouteProvider',
        // Disable the feature of: Calculate window occlusion on Windows will be used in the future to throttle and potentially unload foreground tabs in occluded windows.
        'CalculateNativeWinOcclusion',
        // Disables the Discover feed on NTP
        'InterestFeedContentSuggestions',
        // Don't update the CT lists
        'CertificateTransparencyComponentUpdater',
        // Disables autofill server communication. This feature isn't disabled via other 'parent' flags.
        'AutofillServerCommunication',
        // Disables "Enhanced ad privacy in Chrome" dialog. (Though as of 2024-03-20 it shouldn't show up if the profile has no stored country)
        'PrivacySandboxSettings4',
      ].join(','),

  // Disable all chrome extensions
  '--disable-extensions',
  // Disable some extensions that aren't affected by --disable-extensions
  '--disable-component-extensions-with-background-pages',
  // Disable various background network services, including extension updating,
  //   safe browsing service, upgrade detector, translate, UMA
  '--disable-background-networking',
  // Don't update the browser 'components' listed at chrome://components/
  '--disable-component-update',
  // Disables client-side phishing detection.
  '--disable-client-side-phishing-detection',
  // Disable syncing to a Google account
  '--disable-sync',
  // Disable reporting to UMA, but allows for collection
  '--metrics-recording-only',
  // Disable installation of default apps on first run
  '--disable-default-apps',
  // Mute any audio
  '--mute-audio',
  // Disable the default browser check, do not prompt to set it as such
  '--no-default-browser-check',
  // Skip first run wizards
  '--no-first-run',
  // Disable backgrounding renders for occluded windows
  '--disable-backgrounding-occluded-windows',
  // Disable renderer process backgrounding
  '--disable-renderer-backgrounding',
  // Disable task throttling of timer tasks from background pages.
  '--disable-background-timer-throttling',
  // Disable the default throttling of IPC between renderer & browser processes.
  '--disable-ipc-flooding-protection',
  // Avoid potential instability of using Gnome Keyring or KDE wallet. crbug.com/571003 crbug.com/991424
  '--password-store=basic',
  // Use mock keychain on Mac to prevent blocking permissions dialogs
  '--use-mock-keychain',
  // Disable background tracing (aka slow reports & deep reports) to avoid 'Tracing already started'
  '--force-fieldtrials=*BackgroundTracing/default/',

  // Suppresses hang monitor dialogs in renderer processes. This flag may allow slow unload handlers on a page to prevent the tab from closing.
  '--disable-hang-monitor',
  // Reloading a page that came from a POST normally prompts the user.
  '--disable-prompt-on-repost',
  // Disables Domain Reliability Monitoring, which tracks whether the browser has difficulty contacting Google-owned sites and uploads reports to Google.
  '--disable-domain-reliability',
];
