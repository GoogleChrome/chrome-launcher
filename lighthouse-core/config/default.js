/* eslint-disable */
module.exports = {
  "settings": {},
  "passes": [{
    "passName": "defaultPass",
    "recordNetwork": true,
    "recordTrace": true,
    "pauseBeforeTraceEndMs": 5000,
    "useThrottling": true,
    "gatherers": [
      "url",
      "viewport",
      "viewport-dimensions",
      "theme-color",
      "manifest",
      "image-usage",
      "accessibility"
    ]
  },
  {
    "passName": "offlinePass",
    "recordNetwork": true,
    "useThrottling": false,
    "gatherers": [
      "service-worker",
      "offline"
    ]
  },
  {
    "passName": "redirectPass",
    "useThrottling": false,
    "gatherers": [
      "http-redirect",
      "html-without-javascript"
    ]
  }, {
    "passName": "dbw",
    "recordNetwork": true,
    "useThrottling": false,
    "gatherers": [
      "chrome-console-messages",
      "styles",
      // "css-usage",
      "dobetterweb/all-event-listeners",
      "dobetterweb/anchors-with-no-rel-noopener",
      "dobetterweb/appcache",
      "dobetterweb/console-time-usage",
      "dobetterweb/datenow",
      "dobetterweb/document-write",
      "dobetterweb/geolocation-on-start",
      "dobetterweb/notification-on-start",
      "dobetterweb/domstats",
      "dobetterweb/optimized-images",
      "dobetterweb/tags-blocking-first-paint",
      "dobetterweb/websql"
    ]
  }],

  "audits": [
    "is-on-https",
    "redirects-http",
    "service-worker",
    "works-offline",
    "viewport",
    "without-javascript",
    "first-meaningful-paint",
    "load-fast-enough-for-pwa",
    "speed-index-metric",
    "estimated-input-latency",
    "time-to-interactive",
    "user-timings",
    "critical-request-chains",
    "webapp-install-banner",
    "splash-screen",
    "themed-omnibox",
    "manifest-short-name-length",
    "content-width",
    "deprecations",
    "accessibility/accesskeys",
    "accessibility/aria-allowed-attr",
    "accessibility/aria-required-attr",
    "accessibility/aria-required-children",
    "accessibility/aria-required-parent",
    "accessibility/aria-roles",
    "accessibility/aria-valid-attr-value",
    "accessibility/aria-valid-attr",
    "accessibility/audio-caption",
    "accessibility/button-name",
    "accessibility/bypass",
    "accessibility/color-contrast",
    "accessibility/definition-list",
    "accessibility/dlitem",
    "accessibility/document-title",
    "accessibility/duplicate-id",
    "accessibility/frame-title",
    "accessibility/html-has-lang",
    "accessibility/html-lang-valid",
    "accessibility/image-alt",
    "accessibility/input-image-alt",
    "accessibility/label",
    "accessibility/layout-table",
    "accessibility/link-name",
    "accessibility/list",
    "accessibility/listitem",
    "accessibility/meta-refresh",
    "accessibility/meta-viewport",
    "accessibility/object-alt",
    "accessibility/tabindex",
    "accessibility/td-headers-attr",
    "accessibility/th-has-data-cells",
    "accessibility/valid-lang",
    "accessibility/video-caption",
    "accessibility/video-description",
    "byte-efficiency/total-byte-weight",
    // "byte-efficiency/unused-css-rules",
    "byte-efficiency/offscreen-images",
    "byte-efficiency/uses-optimized-images",
    "byte-efficiency/uses-responsive-images",
    "dobetterweb/appcache-manifest",
    "dobetterweb/dom-size",
    "dobetterweb/external-anchors-use-rel-noopener",
    "dobetterweb/geolocation-on-start",
    "dobetterweb/link-blocking-first-paint",
    "dobetterweb/no-console-time",
    "dobetterweb/no-datenow",
    "dobetterweb/no-document-write",
    "dobetterweb/no-mutation-events",
    "dobetterweb/no-old-flexbox",
    "dobetterweb/no-websql",
    "dobetterweb/notification-on-start",
    "dobetterweb/script-blocking-first-paint",
    "dobetterweb/uses-http2",
    "dobetterweb/uses-passive-event-listeners"
  ],

  "aggregations": [{
    "name": "Progressive Web App",
    "id": "pwa",
    "description": "These audits validate the aspects of a Progressive Web App. They are a subset of the [PWA Checklist](https://developers.google.com/web/progressive-web-apps/checklist).",
    "scored": true,
    "categorizable": true,
    "items": [{
      "name": "App can load on offline/flaky connections",
      "description": "Ensuring your web app can respond when the network connection is unavailable or flaky is critical to providing your users a good experience. This is achieved through use of a [Service Worker](https://developers.google.com/web/fundamentals/primers/service-worker/).",
      "audits": {
        "service-worker": {
          "expectedValue": true,
          "weight": 1
        },
        "works-offline": {
          "expectedValue": true,
          "weight": 1
        }
      }
    },{
      "name": "Page load performance is fast",
      "description": "Users notice if sites and apps don't perform well. These top-level metrics capture the most important perceived performance concerns.",
      "audits": {
        "load-fast-enough-for-pwa": {
          "expectedValue": true,
          "weight": 1
        },
        "first-meaningful-paint": {
          "expectedValue": 100,
          "weight": 1
        },
        "speed-index-metric": {
          "expectedValue": 100,
          "weight": 1
        },
        "estimated-input-latency": {
          "expectedValue": 100,
          "weight": 1
        },
        "time-to-interactive": {
          "expectedValue": 100,
          "weight": 1
        }
      }
    }, {
      "name": "Site is progressively enhanced",
      "description": "Progressive enhancement means that everyone can access the basic content and functionality of a page in any browser, and those without certain browser features may receive a reduced but still functional experience.",
      "audits": {
        "without-javascript": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }, {
      "name": "Network connection is secure",
      "description": "Security is an important part of the web for both developers and users. Moving forward, Transport Layer Security (TLS) support will be required for many APIs.",
      "audits": {
        "is-on-https": {
          "expectedValue": true,
          "weight": 1
        },
        "redirects-http": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }, {
      "name": "User can be prompted to Add to Homescreen",
      "audits": {
        "webapp-install-banner": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }, {
      "name": "Installed web app will launch with custom splash screen",
      "audits": {
        "splash-screen": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }, {
      "name": "Address bar matches brand colors",
      "audits": {
        "themed-omnibox": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }, {
      "name": "Design is mobile-friendly",
      "description": "Users increasingly experience your app on mobile devices, so it's important to ensure that the experience can adapt to smaller screens.",
      "audits": {
        "viewport": {
          "expectedValue": true,
          "weight": 1
        },
        "content-width": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }]
  }, {
    "name": "Best Practices",
    "id": "bp",
    "description": "We've compiled some recommendations for modernizing your web app and avoiding performance pitfalls. These audits do not affect your score but are worth a look.",
    "scored": false,
    "categorizable": true,
    "items": [{
      "name": "Using modern offline features",
      "audits": {
        "appcache-manifest": {
          "expectedValue": true,
          "weight": 1
        },
        "no-websql": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }, {
      "name": "Using modern protocols",
      "audits": {
        "is-on-https": {
          "expectedValue": true,
          "weight": 1
        },
        "uses-http2": {
          "expectedValue": true,
          "description": "Resources made by this application should be severed over HTTP/2 for improved performance.",
          "weight": 1
        }
      }
    }, {
      "name": "Using modern CSS features",
      "audits": {
        "no-old-flexbox": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }, {
      "name": "Using modern JavaScript features",
      "audits": {
        "uses-passive-event-listeners": {
          "expectedValue": true,
          "weight": 1
        },
        "no-mutation-events": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }, {
      "name": "Avoiding APIs that harm the user experience",
      "audits": {
        "no-document-write": {
          "expectedValue": true,
          "weight": 1
        },
        "external-anchors-use-rel-noopener": {
          "expectedValue": true,
          "weight": 1
        },
        "geolocation-on-start": {
          "expectedValue": true,
          "weight": 1
        },
        "notification-on-start": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }, {
      "name": "Avoiding deprecated APIs and browser interventions",
      "audits": {
        "deprecations": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }, {
      "name": "Other",
      "audits": {
        "manifest-short-name-length": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }]
  }, {
      "name": "Accessibility",
      "id": "accessibility",
      "description": "These checks highlight opportunities to improve the accessibility of your app.",
      "scored": false,
      "categorizable": true,
      "items": [{
        "name": "Color contrast of elements is satisfactory",
        "audits": {
          "color-contrast": {
            "expectedValue": true,
            "weight": 1
          }
        }
      }, {
        "name": "Elements are well structured",
        "audits": {
          "definition-list": {
            "expectedValue": true,
            "weight": 1
          },
          "dlitem": {
            "expectedValue": true,
            "weight": 1
          },
          "duplicate-id": {
            "expectedValue": true,
            "weight": 1
          },
          "list": {
            "expectedValue": true,
            "weight": 1
          },
          "listitem": {
            "expectedValue": true,
            "weight": 1
          }
        }
      }, {
        "name": "Elements avoid incorrect use of attributes",
        "audits": {
          "accesskeys": {
            "expectedValue": true,
            "weight": 1
          },
          "audio-caption": {
            "expectedValue": true,
            "weight": 1
          },
          "image-alt": {
            "expectedValue": true,
            "weight": 1
          },
          "input-image-alt": {
            "expectedValue": true,
            "weight": 1
          },
          "tabindex": {
            "expectedValue": true,
            "weight": 1
          },
          "td-headers-attr": {
            "expectedValue": true,
            "weight": 1
          },
          "th-has-data-cells": {
            "expectedValue": true,
            "weight": 1
          }
        }
      }, {
        "name": "Elements applying ARIA follow correct practices",
        "audits": {
          "aria-allowed-attr": {
            "expectedValue": true,
            "weight": 1
          },
          "aria-required-attr": {
            "expectedValue": true,
            "weight": 1
          },
          "aria-required-children": {
            "expectedValue": true,
            "weight": 1
          },
          "aria-required-parent": {
            "expectedValue": true,
            "weight": 1
          },
          "aria-roles": {
            "expectedValue": true,
            "weight": 1
          },
          "aria-valid-attr-value": {
            "expectedValue": true,
            "weight": 1
          },
          "aria-valid-attr": {
            "expectedValue": true,
            "weight": 1
          }
        }
      }, {
        "name": "Elements describe their contents well",
        "audits": {
          "document-title": {
            "expectedValue": true,
            "weight": 1
          },
          "frame-title": {
            "expectedValue": true,
            "weight": 1
          },
          "label": {
            "expectedValue": true,
            "weight": 1
          },
          "layout-table": {
            "expectedValue": true,
            "weight": 1
          },
          "object-alt": {
            "expectedValue": true,
            "weight": 1
          },
          "video-caption": {
            "expectedValue": true,
            "weight": 1
          },
          "video-description": {
            "expectedValue": true,
            "weight": 1
          }
        }
      }, {
        "name": "The page's language is specified and valid",
        "audits": {
          "html-has-lang": {
            "expectedValue": true,
            "weight": 1
          },
          "html-lang-valid": {
            "expectedValue": true,
            "weight": 1
          },
          "valid-lang": {
            "expectedValue": true,
            "weight": 1
          }
        }
      }, {
        "name": "The document does not use <meta http-equiv=\"refresh\">",
        "audits": {
          "meta-refresh": {
            "expectedValue": true,
            "weight": 1
          }
        }
      }, {
        "name": "The <meta name=\"viewport\"> element follows best practices",
        "audits": {
          "meta-viewport": {
            "expectedValue": true,
            "weight": 1
          }
        }
      }, {
        "name": "Links and buttons have discernable names",
        "audits": {
          "button-name": {
            "expectedValue": true,
            "weight": 1
          },
          "link-name": {
            "expectedValue": true,
            "weight": 1
          }
        }
      }, {
        "name": "Repetitive content can be bypassed",
        "audits": {
          "bypass": {
            "expectedValue": true,
            "weight": 1
          }
        }
      }]
    }, {
    "name": "Performance",
    "id": "perf",
    "description": "These encapsulate your app's performance.",
    "scored": false,
    "categorizable": false,
    "items": [{
      "audits": {
        "total-byte-weight": {
          "expectedValue": 100,
          "weight": 1
        },
        "dom-size": {
          "expectedValue": 100,
          "weight": 1
        },
        "uses-optimized-images": {
          "expectedValue": true,
          "weight": 1
        },
        "uses-responsive-images": {
          "expectedValue": true,
          "weight": 1
        },
        "offscreen-images": {
          "expectedValue": true,
          "weight": 1
        },
        // "unused-css-rules": {
        //   "expectedValue": true,
        //   "weight": 1
        // },
        "link-blocking-first-paint": {
          "expectedValue": true,
          "weight": 1
        },
        "script-blocking-first-paint": {
          "expectedValue": true,
          "weight": 1
        },
         "critical-request-chains": {
          "expectedValue": true,
          "weight": 1
        },
        "user-timings": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }]
  }, {
    "name": "Fancier stuff",
    "id": "fancy",
    "description": "A list of newer features that you could be using in your app. These audits do not affect your score and are just suggestions.",
    "scored": false,
    "categorizable": true,
    "additional": true,
    "items": [{
      "name": "New JavaScript features",
      "audits": {
        "no-datenow": {
          "expectedValue": true,
          "weight": 1
        },
        "no-console-time": {
          "expectedValue": true,
          "weight": 1
        }
      }
    }]
  }],
  "categories": {
    "pwa": {
      "name": "Progressive Web App",
      "weight": 1,
      "description": "These audits validate the aspects of a Progressive Web App. They are a subset of the [PWA Checklist](https://developers.google.com/web/progressive-web-apps/checklist).",
      "audits": [
        {"id": "service-worker", "weight": 1},
        {"id": "works-offline", "weight": 1},
        {"id": "without-javascript", "weight": 1},
        {"id": "is-on-https", "weight": 1},
        {"id": "redirects-http", "weight": 1},
        {"id": "load-fast-enough-for-pwa", "weight": 1},
        {"id": "webapp-install-banner", "weight": 1},
        {"id": "splash-screen", "weight": 1},
        {"id": "themed-omnibox", "weight": 1},
        {"id": "viewport", "weight": 1},
        {"id": "content-width", "weight": 1}
      ]
    },
    "performance": {
      "name": "Performance",
      "description": "These encapsulate your app's performance.",
      "audits": [
        {"id": "first-meaningful-paint", "weight": 5},
        {"id": "speed-index-metric", "weight": 1},
        {"id": "estimated-input-latency", "weight": 1},
        {"id": "time-to-interactive", "weight": 5},
        {"id": "link-blocking-first-paint", "weight": 0},
        {"id": "script-blocking-first-paint", "weight": 0},
        // {"id": "unused-css-rules", "weight": 0},
        {"id": "uses-optimized-images", "weight": 0},
        {"id": "uses-responsive-images", "weight": 0},
        {"id": "total-byte-weight", "weight": 0},
        {"id": "dom-size", "weight": 0},
        {"id": "critical-request-chains", "weight": 0},
        {"id": "user-timings", "weight": 0}
      ]
    },
    "accessibility": {
      "name": "Accessibility",
      "description": "These audits validate that your app [works for all users](https://developers.google.com/web/fundamentals/accessibility/).",
      "audits": [
        {"id": "accesskeys", "weight": 1},
        {"id": "aria-allowed-attr", "weight": 1},
        {"id": "aria-required-attr", "weight": 1},
        {"id": "aria-required-children", "weight": 1},
        {"id": "aria-required-parent", "weight": 1},
        {"id": "aria-roles", "weight": 1},
        {"id": "aria-valid-attr-value", "weight": 1},
        {"id": "aria-valid-attr", "weight": 1},
        {"id": "audio-caption", "weight": 1},
        {"id": "button-name", "weight": 1},
        {"id": "bypass", "weight": 1},
        {"id": "color-contrast", "weight": 1},
        {"id": "definition-list", "weight": 1},
        {"id": "dlitem", "weight": 1},
        {"id": "document-title", "weight": 1},
        {"id": "duplicate-id", "weight": 1},
        {"id": "frame-title", "weight": 1},
        {"id": "html-has-lang", "weight": 1},
        {"id": "html-lang-valid", "weight": 1},
        {"id": "image-alt", "weight": 1},
        {"id": "input-image-alt", "weight": 1},
        {"id": "label", "weight": 1},
        {"id": "layout-table", "weight": 1},
        {"id": "link-name", "weight": 1},
        {"id": "list", "weight": 1},
        {"id": "listitem", "weight": 1},
        {"id": "meta-refresh", "weight": 1},
        {"id": "meta-viewport", "weight": 1},
        {"id": "object-alt", "weight": 1},
        {"id": "tabindex", "weight": 1},
        {"id": "td-headers-attr", "weight": 1},
        {"id": "th-has-data-cells", "weight": 1},
        {"id": "valid-lang", "weight": 1},
        {"id": "video-caption", "weight": 1},
        {"id": "video-description", "weight": 1},
      ]
    },
    "best-practices": {
      "name": "Best Practices",
      "description": "We've compiled some recommendations for modernizing your web app and avoiding performance pitfalls. These audits do not affect your score but are worth a look.",
      "audits": [
        {"id": "appcache-manifest", "weight": 1},
        {"id": "no-websql", "weight": 1},
        {"id": "is-on-https", "weight": 1},
        {"id": "uses-http2", "weight": 1},
        {"id": "no-old-flexbox", "weight": 1},
        {"id": "uses-passive-event-listeners", "weight": 1},
        {"id": "no-mutation-events", "weight": 1},
        {"id": "no-document-write", "weight": 1},
        {"id": "external-anchors-use-rel-noopener", "weight": 1},
        {"id": "geolocation-on-start", "weight": 1},
        {"id": "notification-on-start", "weight": 1},
        {"id": "deprecations", "weight": 1},
        {"id": "manifest-short-name-length", "weight": 1},
      ]
    }
  }
}
