/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
      'manifest-display': {
        score: true,
        displayValue: 'standalone'
      },
      'manifest-exists': {
        score: true
      },
      'manifest-background-color': {
        score: true,
        extendedInfo: {
          value: '#2196F3'
        }
      },
      'manifest-theme-color': {
        score: true
      },
      'manifest-icons-min-192': {
        score: true
      },
      'manifest-icons-min-144': {
        score: true
      },
      'manifest-name': {
        score: true
      },
      'manifest-short-name': {
        score: true
      },
      'manifest-start-url': {
        score: true
      },
      // 'cache-start-url': {
      //   score: true
      // }
    }
  },

  {
    initialUrl: 'https://www.chromestatus.com/',
    url: 'https://www.chromestatus.com/features',
    audits: {
      'dom-size': {
        score: 100,
        extendedInfo: {
          value: {
            1: {value: '20'},
            2: {snippet: /ul.versionlist/}
          }
        }
      },
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
      'manifest-display': {
        score: true,
        displayValue: 'standalone'
      },
      'manifest-exists': {
        score: true
      },
      'manifest-background-color': {
        score: true,
        extendedInfo: {
          value: '#366597'
        }
      },
      'manifest-theme-color': {
        score: true
      },
      'manifest-icons-min-192': {
        score: true
      },
      'manifest-icons-min-144': {
        score: true
      },
      'manifest-name': {
        score: true
      },
      'manifest-short-name': {
        score: true
      },
      'manifest-start-url': {
        score: true
      },
      // 'cache-start-url': {
      //   score: true
      // }
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
        score: true
      },
      'service-worker': {
        score: true
      },
      'works-offline': {
        score: true
      },
      'manifest-display': {
        score: true,
        displayValue: 'standalone'
      },
      'manifest-exists': {
        score: true
      },
      'manifest-background-color': {
        score: true,
        extendedInfo: {
          value: '#bababa'
        }
      },
      'manifest-theme-color': {
        score: true
      },
      'manifest-icons-min-192': {
        score: true,
        displayValue: 'found sizes: 600x600',
      },
      'manifest-icons-min-144': {
        score: true,
        displayValue: 'found sizes: 600x600',
      },
      'manifest-name': {
        score: true
      },
      'manifest-short-name': {
        score: true
      },
      'manifest-start-url': {
        score: true
      },
      // 'cache-start-url': {
      //   score: true
      // }
    }
  },

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
  //     'manifest-display': {
  //       score: true,
  //       displayValue: 'standalone'
  //     },
  //     'manifest-exists': {
  //       score: true
  //     },
  //     'manifest-background-color': {
  //       score: true,
  //       extendedInfo: {
  //         value: '#fff'
  //       }
  //     },
  //     'manifest-theme-color': {
  //       score: true
  //     },
  //     'manifest-icons-min-192': {
  //       score: true
  //     },
  //     'manifest-icons-min-144': {
  //       score: true
  //     },
  //     'manifest-name': {
  //       score: true
  //     },
  //     'manifest-short-name': {
  //       score: true
  //     },
  //     'manifest-start-url': {
  //       score: true
  //     },
  //     // 'cache-start-url': {
  //     //   score: true
  //     // }
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
      'manifest-display': {
        score: true,
        displayValue: 'standalone'
      },
      'manifest-exists': {
        score: true
      },
      'manifest-background-color': {
        score: true,
        extendedInfo: {
          value: '#383838'
        }
      },
      'manifest-theme-color': {
        score: true
      },
      'manifest-icons-min-192': {
        score: true
      },
      'manifest-icons-min-144': {
        score: true
      },
      'manifest-name': {
        score: true
      },
      'manifest-short-name': {
        score: true
      },
      'manifest-start-url': {
        score: true
      },
      // 'cache-start-url': {
      //   score: true
      // }
    }
  }
];
