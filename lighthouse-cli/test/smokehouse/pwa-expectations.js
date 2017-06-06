/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Expected Lighthouse audit values for various sites with stable(ish) PWA
 * results.
 */
module.exports = [
  {
    initialUrl: 'https://airhorner.com',
    url: 'https://airhorner.com/',
    audits: {
      'is-on-https': {
        score: true
      },
      'redirects-http': {
        score: true
      },
      'service-worker': {
        score: true
      },
      'works-offline': {
        score: true
      },
      'viewport': {
        score: true
      },
      'without-javascript': {
        score: true
      },
      'load-fast-enough-for-pwa': {
        // Ignore speed test; just verify that it ran.
      },
      'webapp-install-banner': {
        score: true,
        extendedInfo: {
          value: {
            manifestValues: {
              allChecks: [
                {id: 'hasStartUrl', passing: true},
                {id: 'hasIconsAtLeast192px', passing: true},
                {id: 'hasIconsAtLeast512px', passing: true},
                {id: 'hasPWADisplayValue', passing: true},
                {id: 'hasBackgroundColor', passing: true},
                {id: 'hasThemeColor', passing: true},
                {id: 'hasShortName', passing: true},
                {id: 'shortNameLength', passing: true},
                {id: 'hasName', passing: true}
              ]
            }
          }
        }
      },
      'splash-screen': {
        score: true,
        extendedInfo: {
          value: {
            manifestValues: {
              allChecks: [
                {id: 'hasStartUrl', passing: true},
                {id: 'hasIconsAtLeast192px', passing: true},
                {id: 'hasIconsAtLeast512px', passing: true},
                {id: 'hasPWADisplayValue', passing: true},
                {id: 'hasBackgroundColor', passing: true},
                {id: 'hasThemeColor', passing: true},
                {id: 'hasShortName', passing: true},
                {id: 'shortNameLength', passing: true},
                {id: 'hasName', passing: true}
              ]
            }
          }
        }
      },
      'themed-omnibox': {
        score: true,
        extendedInfo: {
          value: {
            manifestValues: {
              allChecks: [
                {id: 'hasStartUrl', passing: true},
                {id: 'hasIconsAtLeast192px', passing: true},
                {id: 'hasIconsAtLeast512px', passing: true},
                {id: 'hasPWADisplayValue', passing: true},
                {id: 'hasBackgroundColor', passing: true},
                {id: 'hasThemeColor', passing: true},
                {id: 'hasShortName', passing: true},
                {id: 'shortNameLength', passing: true},
                {id: 'hasName', passing: true}
              ]
            }
          }
        }
      },
      'content-width': {
        score: true
      },

      // "manual" audits. Just verify in the results.
      'pwa-cross-browser': {
        score: false,
        manual: true
      },
      'pwa-page-transitions': {
        score: false,
        manual: true
      },
      'pwa-each-page-has-url': {
        score: false,
        manual: true
      }
    }
  },

  {
    initialUrl: 'https://www.chromestatus.com/',
    url: 'https://www.chromestatus.com/features',
    audits: {
      'is-on-https': {
        score: true
      },
      'redirects-http': {
        score: true
      },
      'service-worker': {
        score: true
      },
      'works-offline': {
        score: false
      },
      'viewport': {
        score: true
      },
      'without-javascript': {
        score: true
      },
      'load-fast-enough-for-pwa': {
        // Ignore speed test; just verify that it ran.
      },
      'webapp-install-banner': {
        score: false,
        extendedInfo: {
          value: {
            manifestValues: {
              allChecks: [
                {id: 'hasStartUrl', passing: true},
                {id: 'hasIconsAtLeast192px', passing: true},
                {id: 'hasIconsAtLeast512px', passing: true},
                {id: 'hasPWADisplayValue', passing: true},
                {id: 'hasBackgroundColor', passing: true},
                {id: 'hasThemeColor', passing: true},
                {id: 'hasShortName', passing: true},
                {id: 'shortNameLength', passing: false},
                {id: 'hasName', passing: true}
              ]
            }
          }
        }
      },
      'splash-screen': {
        score: true,
        extendedInfo: {
          value: {
            manifestValues: {
              allChecks: [
                {id: 'hasStartUrl', passing: true},
                {id: 'hasIconsAtLeast192px', passing: true},
                {id: 'hasIconsAtLeast512px', passing: true},
                {id: 'hasPWADisplayValue', passing: true},
                {id: 'hasBackgroundColor', passing: true},
                {id: 'hasThemeColor', passing: true},
                {id: 'hasShortName', passing: true},
                {id: 'shortNameLength', passing: false},
                {id: 'hasName', passing: true}
              ]
            }
          }
        }
      },
      'themed-omnibox': {
        score: true,
        extendedInfo: {
          value: {
            manifestValues: {
              allChecks: [
                {id: 'hasStartUrl', passing: true},
                {id: 'hasIconsAtLeast192px', passing: true},
                {id: 'hasIconsAtLeast512px', passing: true},
                {id: 'hasPWADisplayValue', passing: true},
                {id: 'hasBackgroundColor', passing: true},
                {id: 'hasThemeColor', passing: true},
                {id: 'hasShortName', passing: true},
                {id: 'shortNameLength', passing: false},
                {id: 'hasName', passing: true}
              ]
            }
          }
        }
      },
      'content-width': {
        score: true
      },

      // "manual" audits. Just verify in the results.
      'pwa-cross-browser': {
        score: false,
        manual: true
      },
      'pwa-page-transitions': {
        score: false,
        manual: true
      },
      'pwa-each-page-has-url': {
        score: false,
        manual: true
      }
    }
  },

  {
    initialUrl: 'https://jakearchibald.github.io/svgomg/',
    url: 'https://jakearchibald.github.io/svgomg/',
    audits: {
      'is-on-https': {
        score: true
      },
      'redirects-http': {
        // Note: relies on JS redirect.
        // see https://github.com/GoogleChrome/lighthouse/issues/2383
        score: false
      },
      'service-worker': {
        score: true
      },
      'works-offline': {
        score: true
      },
      'viewport': {
        score: true
      },
      'without-javascript': {
        score: true
      },
      'load-fast-enough-for-pwa': {
        // Ignore speed test; just verify that it ran.
      },
      'webapp-install-banner': {
        score: false,
        extendedInfo: {
          value: {
            manifestValues: {
              allChecks: [
                {id: 'hasStartUrl', passing: true},
                {id: 'hasIconsAtLeast192px', passing: true},
                {id: 'hasIconsAtLeast512px', passing: true},
                {id: 'hasPWADisplayValue', passing: true},
                {id: 'hasBackgroundColor', passing: true},
                {id: 'hasThemeColor', passing: true},
                {id: 'hasShortName', passing: false},
                {id: 'shortNameLength', passing: false},
                {id: 'hasName', passing: true}
              ]
            }
          }
        }
      },
      'splash-screen': {
        score: true,
        extendedInfo: {
          value: {
            manifestValues: {
              allChecks: [
                {id: 'hasStartUrl', passing: true},
                {id: 'hasIconsAtLeast192px', passing: true},
                {id: 'hasIconsAtLeast512px', passing: true},
                {id: 'hasPWADisplayValue', passing: true},
                {id: 'hasBackgroundColor', passing: true},
                {id: 'hasThemeColor', passing: true},
                {id: 'hasShortName', passing: false},
                {id: 'shortNameLength', passing: false},
                {id: 'hasName', passing: true}
              ]
            }
          }
        }
      },
      'themed-omnibox': {
        score: true,
        extendedInfo: {
          value: {
            manifestValues: {
              allChecks: [
                {id: 'hasStartUrl', passing: true},
                {id: 'hasIconsAtLeast192px', passing: true},
                {id: 'hasIconsAtLeast512px', passing: true},
                {id: 'hasPWADisplayValue', passing: true},
                {id: 'hasBackgroundColor', passing: true},
                {id: 'hasThemeColor', passing: true},
                {id: 'hasShortName', passing: false},
                {id: 'shortNameLength', passing: false},
                {id: 'hasName', passing: true}
              ]
            }
          }
        }
      },
      'content-width': {
        score: true
      },

      // "manual" audits. Just verify in the results.
      'pwa-cross-browser': {
        score: false,
        manual: true
      },
      'pwa-page-transitions': {
        score: false,
        manual: true
      },
      'pwa-each-page-has-url': {
        score: false,
        manual: true
      }
    }
  },

  // Disabled due to flakiness of site.
  // See https://github.com/GoogleChrome/lighthouse/issues/1656
  // {
  //   initialUrl: 'https://shop.polymer-project.org/',
  //   url: 'https://shop.polymer-project.org/',
  //   audits: {
  //     'is-on-https': {
  //       score: true
  //     },
  //     'redirects-http': {
  //       score: true
  //     },
  //     'service-worker': {
  //       score: true
  //     },
  //     'works-offline': {
  //       score: true
  //     },
  //     'viewport': {
  //       score: true
  //     },
  //     'without-javascript': {
  //       score: true
  //     },
  //     'load-fast-enough-for-pwa': {
  //       // Ignore speed test; just verify that it ran.
  //     },
  //     'webapp-install-banner': {
  //       score: true,
  //       extendedInfo: {
  //         value: {
  //           manifestValues: {
  //             allChecks: [
  //               {id: 'hasStartUrl', passing: true},
  //               {id: 'hasIconsAtLeast192px', passing: true},
  //               {id: 'hasIconsAtLeast512px', passing: true},
  //               {id: 'hasPWADisplayValue', passing: true},
  //               {id: 'hasBackgroundColor', passing: true},
  //               {id: 'hasThemeColor', passing: true},
  //               {id: 'hasShortName', passing: true},
  //               {id: 'shortNameLength', passing: true},
  //               {id: 'hasName', passing: true}
  //             ]
  //           }
  //         }
  //       }
  //     },
  //     'splash-screen': {
  //       score: true,
  //       extendedInfo: {
  //         value: {
  //           manifestValues: {
  //             allChecks: [
  //               {id: 'hasStartUrl', passing: true},
  //               {id: 'hasIconsAtLeast192px', passing: true},
  //               {id: 'hasIconsAtLeast512px', passing: true},
  //               {id: 'hasPWADisplayValue', passing: true},
  //               {id: 'hasBackgroundColor', passing: true},
  //               {id: 'hasThemeColor', passing: true},
  //               {id: 'hasShortName', passing: true},
  //               {id: 'shortNameLength', passing: true},
  //               {id: 'hasName', passing: true}
  //             ]
  //           }
  //         }
  //       }
  //     },
  //     'themed-omnibox': {
  //       score: true,
  //       extendedInfo: {
  //         value: {
  //           manifestValues: {
  //             allChecks: [
  //               {id: 'hasStartUrl', passing: true},
  //               {id: 'hasIconsAtLeast192px', passing: true},
  //               {id: 'hasIconsAtLeast512px', passing: true},
  //               {id: 'hasPWADisplayValue', passing: true},
  //               {id: 'hasBackgroundColor', passing: true},
  //               {id: 'hasThemeColor', passing: true},
  //               {id: 'hasShortName', passing: true},
  //               {id: 'shortNameLength', passing: true},
  //               {id: 'hasName', passing: true}
  //             ]
  //           }
  //         }
  //       }
  //     },
  //     'content-width': {
  //       score: true
  //     },

  //     // "manual" audits. Just verify in the results.
  //     'pwa-cross-browser': {
  //       score: false,
  //       manual: true
  //     },
  //     'pwa-page-transitions': {
  //       score: false,
  //       manual: true
  //     },
  //     'pwa-each-page-has-url': {
  //       score: false,
  //       manual: true
  //     }
  //   }
  // },

  {
    initialUrl: 'https://pwa.rocks',
    url: 'https://pwa.rocks/',
    audits: {
      'is-on-https': {
        score: true
      },
      'redirects-http': {
        score: true
      },
      'service-worker': {
        score: true
      },
      'works-offline': {
        score: true
      },
      'viewport': {
        score: true
      },
      'without-javascript': {
        score: true
      },
      'load-fast-enough-for-pwa': {
        // Ignore speed test; just verify that it ran .
      },
      'webapp-install-banner': {
        score: true,
        extendedInfo: {
          value: {
            manifestValues: {
              allChecks: [
                {id: 'hasStartUrl', passing: true},
                {id: 'hasIconsAtLeast192px', passing: true},
                {id: 'hasIconsAtLeast512px', passing: false},
                {id: 'hasPWADisplayValue', passing: true},
                {id: 'hasBackgroundColor', passing: true},
                {id: 'hasThemeColor', passing: true},
                {id: 'hasShortName', passing: true},
                {id: 'shortNameLength', passing: true},
                {id: 'hasName', passing: true}
              ]
            }
          }
        }
      },
      'splash-screen': {
        score: false,
        extendedInfo: {
          value: {
            manifestValues: {
              allChecks: [
                {id: 'hasStartUrl', passing: true},
                {id: 'hasIconsAtLeast192px', passing: true},
                {id: 'hasIconsAtLeast512px', passing: false},
                {id: 'hasPWADisplayValue', passing: true},
                {id: 'hasBackgroundColor', passing: true},
                {id: 'hasThemeColor', passing: true},
                {id: 'hasShortName', passing: true},
                {id: 'shortNameLength', passing: true},
                {id: 'hasName', passing: true}
              ]
            }
          }
        }
      },
      'themed-omnibox': {
        score: false,
        extendedInfo: {
          value: {
            manifestValues: {
              allChecks: [
                {id: 'hasStartUrl', passing: true},
                {id: 'hasIconsAtLeast192px', passing: true},
                {id: 'hasIconsAtLeast512px', passing: false},
                {id: 'hasPWADisplayValue', passing: true},
                {id: 'hasBackgroundColor', passing: true},
                {id: 'hasThemeColor', passing: true},
                {id: 'hasShortName', passing: true},
                {id: 'shortNameLength', passing: true},
                {id: 'hasName', passing: true}
              ]
            }
          }
        }
      },
      'content-width': {
        score: true
      },

      // "manual" audits. Just verify in the results.
      'pwa-cross-browser': {
        score: false,
        manual: true
      },
      'pwa-page-transitions': {
        score: false,
        manual: true
      },
      'pwa-each-page-has-url': {
        score: false,
        manual: true
      }
    }
  }
];
