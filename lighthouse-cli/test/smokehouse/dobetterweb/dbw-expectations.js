/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Expected Lighthouse audit values for Do Better Web tests.
 */
module.exports = [
  {
    initialUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
    url: 'http://localhost:10200/dobetterweb/dbw_tester.html',
    audits: {
      'is-on-https': {
        score: false
      },
      'uses-http2': {
        score: false,
        extendedInfo: {
          value: {
            results: {
              length: 14
            }
          }
        }
      },
      'external-anchors-use-rel-noopener': {
        score: false,
        debugString: 'Lighthouse was unable to determine the destination of some anchor tags. ' +
                     'If they are not used as hyperlinks, consider removing the _blank target.',
        extendedInfo: {
          value: {
            length: 3
          }
        }
      },
      'appcache-manifest': {
        score: false,
        debugString: 'Found <html manifest="clock.appcache">.'
      },
      'geolocation-on-start': {
        score: false
      },
      'link-blocking-first-paint': {
        score: 0,
        extendedInfo: {
          value: {
            results: {
              length: 4
            }
          }
        }
      },
      'no-document-write': {
        score: false,
        extendedInfo: {
          value: {
            length: 3
          }
        }
      },
      'no-mutation-events': {
        score: false,
        extendedInfo: {
          value: {
            results: {
              length: 6
            }
          }
        }
      },
      // 'no-old-flexbox': {
      //   score: false,
      //   extendedInfo: {
      //     value: {
      //       results: {
      //         length: 7
      //       }
      //     }
      //   }
      // },
      'no-websql': {
        score: false,
        debugString: 'Found database "mydb", version: 1.0.'
      },
      'notification-on-start': {
        score: false
      },
      'script-blocking-first-paint': {
        // TODO: re-enable score assertions when we have more flexible assertions like < 100
        // score: 90,
        extendedInfo: {
          value: {
            results: {
              length: 1
            }
          }
        }
      },
      'uses-passive-event-listeners': {
        score: false,
        extendedInfo: {
          value: {
            // Note: This would normally be 7 but M56 defaults document-level
            // listeners to passive. See https://www.chromestatus.com/features/5093566007214080
            length: 4
          }
        }
      },
      'deprecations': {
        score: false,
        extendedInfo: {
          value: {
            length: 4
          }
        }
      },
      'password-inputs-can-be-pasted-into': {
        score: false,
        extendedInfo: {
          value: {
            length: 2
          }
        }
      },
    }
  }, {
    initialUrl: 'http://localhost:10200/dobetterweb/domtester.html?smallDOM',
    url: 'http://localhost:10200/dobetterweb/domtester.html?smallDOM',
    audits: {
      'dom-size': {
        score: 100,
        extendedInfo: {
          value: {
            0: {value: '1,324'},
            1: {value: '7'},
            2: {value: '1,303'}
          }
        }
      }
    }
  }, {
    initialUrl: 'http://localhost:10200/dobetterweb/domtester.html?largeDOM&withShadowDOM',
    url: 'http://localhost:10200/dobetterweb/domtester.html?largeDOM&withShadowDOM',
    audits: {
      'dom-size': {
        score: 0,
        extendedInfo: {
          value: {
            0: {value: '6,025'},
            1: {value: '9'},
            2: {value: '6,003'}
          }
        }
      }
    }
  }, {
    initialUrl: 'http://localhost:10200/dobetterweb/domtester.html?withShadowDOM',
    url: 'http://localhost:10200/dobetterweb/domtester.html?withShadowDOM',
    audits: {
      'dom-size': {
        score: 100,
        extendedInfo: {
          value: {
            0: {value: '25'},
            1: {value: '9'},
            2: {value: '9'}
          }
        }
      }
    }
  }, {
    initialUrl: 'http://localhost:10200/dobetterweb/domtester.html?ShadowRootWithManyChildren',
    url: 'http://localhost:10200/dobetterweb/domtester.html?ShadowRootWithManyChildren',
    audits: {
      'dom-size': {
        score: 100,
        extendedInfo: {
          value: {
            0: {value: '24'},
            1: {value: '7'},
            2: {value: '9'}
          }
        }
      }
    }
  }, {
    initialUrl: 'http://localhost:10200/online-only.html',
    url: 'http://localhost:10200/online-only.html',
    audits: {
      'is-on-https': {
        score: true
      },
      'uses-http2': {
        score: false
      },
      'external-anchors-use-rel-noopener': {
        score: true
      },
      'appcache-manifest': {
        score: true
      },
      'geolocation-on-start': {
        score: true
      },
      'link-blocking-first-paint': {
        score: 100
      },
      'no-document-write': {
        score: true
      },
      'no-mutation-events': {
        score: true
      },
      // 'no-old-flexbox': {
      //   score: true
      // },
      'no-websql': {
        score: true
      },
      'script-blocking-first-paint': {
        score: 100
      },
      'uses-passive-event-listeners': {
        score: true
      },
      'password-inputs-can-be-pasted-into': {
        score: true
      },
    }
  }
];
