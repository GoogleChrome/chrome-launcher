/* eslint-disable */
module.exports = {
  "settings": {},
  "passes": [{
    "passName": "defaultPass",
    "recordTrace": true,
    "pauseAfterLoadMs": 5000,
    "networkQuietThresholdMs": 5000,
    "pauseAfterNetworkQuietMs": 2500,
    "useThrottling": true,
    "gatherers": [
      "url",
      "viewport",
      "viewport-dimensions",
      "theme-color",
      "manifest",
      "chrome-console-messages",
      "image-usage",
      // "css-usage",
      "accessibility",
      "dobetterweb/all-event-listeners",
      "dobetterweb/anchors-with-no-rel-noopener",
      "dobetterweb/appcache",
      "dobetterweb/domstats",
      "dobetterweb/optimized-images",
      "dobetterweb/response-compression",
      "dobetterweb/tags-blocking-first-paint",
      "dobetterweb/websql",
    ]
  },
  {
    "passName": "offlinePass",
    "useThrottling": false,
    // Just wait for onload
    "networkQuietThresholdMs": 0,
    "gatherers": [
      "service-worker",
      "offline",
      "start-url",
    ]
  },
  {
    "passName": "redirectPass",
    "useThrottling": false,
    // Just wait for onload
    "networkQuietThresholdMs": 0,
    // Speed up the redirect pass by blocking stylesheets, fonts, and images
    "blockedUrlPatterns": ["*.css", "*.jpg", "*.jpeg", "*.png", "*.gif", "*.svg", "*.ttf", "*.woff", "*.woff2"],
    "gatherers": [
      "http-redirect",
      "html-without-javascript",
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
    "screenshot-thumbnails",
    "estimated-input-latency",
    // "time-to-firstbyte",
    "first-interactive",
    "consistently-interactive",
    "time-to-interactive",
    "user-timings",
    "critical-request-chains",
    "webapp-install-banner",
    "splash-screen",
    "themed-omnibox",
    "manifest-short-name-length",
    "content-width",
    "deprecations",
    "manual/pwa-cross-browser",
    "manual/pwa-page-transitions",
    "manual/pwa-each-page-has-url",
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
    "byte-efficiency/uses-webp-images",
    "byte-efficiency/uses-optimized-images",
    "byte-efficiency/uses-request-compression",
    "byte-efficiency/uses-responsive-images",
    "dobetterweb/appcache-manifest",
    "dobetterweb/dom-size",
    "dobetterweb/external-anchors-use-rel-noopener",
    "dobetterweb/geolocation-on-start",
    "dobetterweb/link-blocking-first-paint",
    "dobetterweb/no-document-write",
    "dobetterweb/no-mutation-events",
    // "dobetterweb/no-old-flexbox",
    "dobetterweb/no-websql",
    "dobetterweb/notification-on-start",
    "dobetterweb/script-blocking-first-paint",
    "dobetterweb/uses-http2",
    "dobetterweb/uses-passive-event-listeners"
  ],

  "aggregations": [{
    "name": "Progressive Web App",
    "id": "pwa",
    "description": "These audits validate the aspects of a Progressive Web App. They are a subset of the baseline [PWA Checklist](https://developers.google.com/web/progressive-web-apps/checklist).",
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
        // "time-to-firstbyte": {
        //   "expectedValue": true,
        //   "weight": 1
        // },
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
      "description": "These checks highlight opportunities to [improve the accessibility of your app](https://developers.google.com/web/fundamentals/accessibility).",
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
        "uses-request-compression": {
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
  "groups": {
    "perf-metric": {
      "title": "Metrics",
      "description": "These metrics encapsulate your app's performance across a number of dimensions."
    },
    "perf-hint": {
      "title": "Opportunities",
      "description": "These are opportunities to speed up your application by optimizing the following resources."
    },
    "perf-info": {
      "title": "Diagnostics",
      "description": "More information about the performance of your application."
    },
    "a11y-color-contrast": {
      "title": "Color Contrast Is Satisfactory",
      "description": "Screen readers and other assistive technologies require annotations to understand otherwise ambiguous content."
    },
    "a11y-describe-contents": {
      "title": "Elements Describe Contents Well",
      "description": "Screen readers and other assistive technologies require annotations to understand otherwise ambiguous content."
    },
    "a11y-well-structured": {
      "title": "Elements Are Well Structured",
      "description": "Screen readers and other assistive technologies require annotations to understand otherwise ambiguous content."
    },
    "a11y-aria": {
      "title": "ARIA Attributes Follow Best Practices",
      "description": "Screen readers and other assistive technologies require annotations to understand otherwise ambiguous content."
    },
    "a11y-correct-attributes": {
      "title": "Elements Use Attributes Correctly",
      "description": "Screen readers and other assistive technologies require annotations to understand otherwise ambiguous content."
    },
    "a11y-element-names": {
      "title": "Elements Have Discernable Names",
      "description": "Screen readers and other assistive technologies require annotations to understand otherwise ambiguous content."
    },
    "a11y-language": {
      "title": "Page Specifies Valid Language",
      "description": "Screen readers and other assistive technologies require annotations to understand otherwise ambiguous content."
    },
    "a11y-meta": {
      "title": "Meta Tags Used Properly",
      "description": "Screen readers and other assistive technologies require annotations to understand otherwise ambiguous content."
    },
    "manual-pwa-checks": {
      "title": "Manual checks to verify",
      "description": "These audits are required by the baseline " +
          "[PWA Checklist](https://developers.google.com/web/progressive-web-apps/checklist) but are " +
          "not automatically checked by Lighthouse. They do not affect your score but it's important that you verify them manually."
    },
  },
  "categories": {
    "pwa": {
      "name": "Progressive Web App",
      "weight": 1,
      "description": "These audits validate the aspects of a Progressive Web App, as specified by the baseline [PWA Checklist](https://developers.google.com/web/progressive-web-apps/checklist).",
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
        {"id": "content-width", "weight": 1},
        {"id": "pwa-cross-browser", "weight": 0, "group": "manual-pwa-checks"},
        {"id": "pwa-page-transitions", "weight": 0, "group": "manual-pwa-checks"},
        {"id": "pwa-each-page-has-url", "weight": 0, "group": "manual-pwa-checks"}
      ]
    },
    "performance": {
      "name": "Performance",
      "description": "These encapsulate your app's performance.",
      "audits": [
        {"id": "first-meaningful-paint", "weight": 5, "group": "perf-metric"},
        {"id": "first-interactive", "weight": 5, "group": "perf-metric"},
        {"id": "consistently-interactive", "weight": 5, "group": "perf-metric"},
        {"id": "speed-index-metric", "weight": 1, "group": "perf-metric"},
        {"id": "estimated-input-latency", "weight": 1, "group": "perf-metric"},
        {"id": "link-blocking-first-paint", "weight": 0, "group": "perf-hint"},
        {"id": "script-blocking-first-paint", "weight": 0, "group": "perf-hint"},
        // {"id": "unused-css-rules", "weight": 0},
        {"id": "uses-responsive-images", "weight": 0, "group": "perf-hint"},
        {"id": "offscreen-images", "weight": 0, "group": "perf-hint"},
        {"id": "uses-optimized-images", "weight": 0, "group": "perf-hint"},
        {"id": "uses-webp-images", "weight": 0, "group": "perf-hint"},
        {"id": "uses-request-compression", "weight": 0, "group": "perf-hint"},
        // {"id": "time-to-firstbyte", "weight": 0, "group": "perf-hint"},
        {"id": "total-byte-weight", "weight": 0, "group": "perf-info"},
        {"id": "dom-size", "weight": 0, "group": "perf-info"},
        {"id": "critical-request-chains", "weight": 0, "group": "perf-info"},
        {"id": "user-timings", "weight": 0, "group": "perf-info"},

        {"id": "screenshot-thumbnails", "weight": 0},
      ]
    },
    "accessibility": {
      "name": "Accessibility",
      "description": "These checks highlight opportunities to [improve the accessibility of your app](https://developers.google.com/web/fundamentals/accessibility).",
      "audits": [
        {"id": "accesskeys", "weight": 1, "group": "a11y-correct-attributes"},
        {"id": "aria-allowed-attr", "weight": 1, "group": "a11y-aria"},
        {"id": "aria-required-attr", "weight": 1, "group": "a11y-aria"},
        {"id": "aria-required-children", "weight": 1, "group": "a11y-aria"},
        {"id": "aria-required-parent", "weight": 1, "group": "a11y-aria"},
        {"id": "aria-roles", "weight": 1, "group": "a11y-aria"},
        {"id": "aria-valid-attr-value", "weight": 1, "group": "a11y-aria"},
        {"id": "aria-valid-attr", "weight": 1, "group": "a11y-aria"},
        {"id": "audio-caption", "weight": 1, "group": "a11y-correct-attributes"},
        {"id": "button-name", "weight": 1, "group": "a11y-element-names"},
        {"id": "bypass", "weight": 1, "group": "a11y-describe-contents"},
        {"id": "color-contrast", "weight": 1, "group": "a11y-color-contrast"},
        {"id": "definition-list", "weight": 1, "group": "a11y-well-structured"},
        {"id": "dlitem", "weight": 1, "group": "a11y-well-structured"},
        {"id": "document-title", "weight": 1, "group": "a11y-describe-contents"},
        {"id": "duplicate-id", "weight": 1, "group": "a11y-well-structured"},
        {"id": "frame-title", "weight": 1, "group": "a11y-describe-contents"},
        {"id": "html-has-lang", "weight": 1, "group": "a11y-language"},
        {"id": "html-lang-valid", "weight": 1, "group": "a11y-language"},
        {"id": "image-alt", "weight": 1, "group": "a11y-correct-attributes"},
        {"id": "input-image-alt", "weight": 1, "group": "a11y-correct-attributes"},
        {"id": "label", "weight": 1, "group": "a11y-describe-contents"},
        {"id": "layout-table", "weight": 1, "group": "a11y-describe-contents"},
        {"id": "link-name", "weight": 1, "group": "a11y-element-names"},
        {"id": "list", "weight": 1, "group": "a11y-well-structured"},
        {"id": "listitem", "weight": 1, "group": "a11y-well-structured"},
        {"id": "meta-refresh", "weight": 1, "group": "a11y-meta"},
        {"id": "meta-viewport", "weight": 1, "group": "a11y-meta"},
        {"id": "object-alt", "weight": 1, "group": "a11y-describe-contents"},
        {"id": "tabindex", "weight": 1, "group": "a11y-correct-attributes"},
        {"id": "td-headers-attr", "weight": 1, "group": "a11y-correct-attributes"},
        {"id": "th-has-data-cells", "weight": 1, "group": "a11y-correct-attributes"},
        {"id": "valid-lang", "weight": 1, "group": "a11y-language"},
        {"id": "video-caption", "weight": 1, "group": "a11y-describe-contents"},
        {"id": "video-description", "weight": 1, "group": "a11y-describe-contents"},
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
        // {"id": "no-old-flexbox", "weight": 1},
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
