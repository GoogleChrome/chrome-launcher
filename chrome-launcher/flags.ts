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
