/**
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

/* eslint-env mocha */

const GathererClass = require('../../../gather/computed/critical-request-chains');
const assert = require('assert');
const Gatherer = new GathererClass();

const HIGH = 'High';
const VERY_HIGH = 'VeryHigh';
const MEDIUM = 'Medium';
const LOW = 'Low';
const VERY_LOW = 'VeryLow';

function mockTracingData(prioritiesList, edges) {
  const networkRecords = prioritiesList.map((priority, index) =>
      ({requestId: index.toString(),
        _resourceType: {
          _category: 'fake'
        },
        priority: () => priority,
        initiatorRequest: () => null
      }));

  // add mock initiator information
  edges.forEach(edge => {
    const initiator = networkRecords[edge[0]];
    networkRecords[edge[1]].initiatorRequest = () => initiator;
  });

  return networkRecords;
}

function testGetCriticalChain(data) {
  const networkRecords = mockTracingData(data.priorityList, data.edges);
  return Gatherer.request(networkRecords).then(criticalChains => {
    assert.deepEqual(criticalChains, data.expected);
  });
}

function constructEmptyRequest() {
  return {
    endTime: undefined,
    responseReceivedTime: undefined,
    startTime: undefined,
    url: undefined,
    transferSize: undefined
  };
}

describe('CriticalRequestChain gatherer: getCriticalChain function', () => {
  it('returns correct data for chain of four critical requests', () =>
    testGetCriticalChain({
      priorityList: [HIGH, MEDIUM, VERY_HIGH, HIGH],
      edges: [[0, 1], [1, 2], [2, 3]],
      expected: {
        0: {
          request: constructEmptyRequest(),
          children: {
            1: {
              request: constructEmptyRequest(),
              children: {
                2: {
                  request: constructEmptyRequest(),
                  children: {
                    3: {
                      request: constructEmptyRequest(),
                      children: {}
                    }
                  }
                }
              }
            }
          }
        }
      }
    }));

  it('returns correct data for chain interleaved with non-critical requests',
    () => testGetCriticalChain({
      priorityList: [MEDIUM, HIGH, LOW, MEDIUM, HIGH, VERY_LOW],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
      expected: {
        0: {
          request: constructEmptyRequest(),
          children: {
            1: {
              request: constructEmptyRequest(),
              children: {}
            }
          }
        }
      }
    }));

  it('returns correct data for two parallel chains', () =>
    testGetCriticalChain({
      priorityList: [HIGH, HIGH, HIGH, HIGH],
      edges: [[0, 2], [1, 3]],
      expected: {
        0: {
          request: constructEmptyRequest(),
          children: {
            2: {
              request: constructEmptyRequest(),
              children: {}
            }
          }
        },
        1: {
          request: constructEmptyRequest(),
          children: {
            3: {
              request: constructEmptyRequest(),
              children: {}
            }
          }
        }
      }
    }));

  it('returns correct data for fork at root', () =>
    testGetCriticalChain({
      priorityList: [HIGH, HIGH, HIGH],
      edges: [[0, 1], [0, 2]],
      expected: {
        0: {
          request: constructEmptyRequest(),
          children: {
            1: {
              request: constructEmptyRequest(),
              children: {}
            },
            2: {
              request: constructEmptyRequest(),
              children: {}
            }
          }
        }
      }
    }));

  it('returns correct data for fork at non root', () =>
    testGetCriticalChain({
      priorityList: [HIGH, HIGH, HIGH, HIGH],
      edges: [[0, 1], [1, 2], [1, 3]],
      expected: {
        0: {
          request: constructEmptyRequest(),
          children: {
            1: {
              request: constructEmptyRequest(),
              children: {
                2: {
                  request: constructEmptyRequest(),
                  children: {}
                },
                3: {
                  request: constructEmptyRequest(),
                  children: {}
                }
              }
            }
          }
        }
      }
    }));

  it('returns empty chain list when no critical request', () =>
    testGetCriticalChain({
      priorityList: [LOW, LOW],
      edges: [[0, 1]],
      expected: {}
    }));

  it('returns empty chain list when no request whatsoever', () =>
    testGetCriticalChain({
      priorityList: [],
      edges: [],
      expected: {}
    }));

  it('returns two single node chains for two independent requests', () =>
    testGetCriticalChain({
      priorityList: [HIGH, HIGH],
      edges: [],
      expected: {
        0: {
          request: constructEmptyRequest(),
          children: {}
        },
        1: {
          request: constructEmptyRequest(),
          children: {}
        }
      }
    }));

  it('returns correct data on a random big graph', () =>
    testGetCriticalChain({
      priorityList: Array(9).fill(HIGH),
      edges: [[0, 1], [1, 2], [1, 3], [4, 5], [5, 7], [7, 8], [5, 6]],
      expected: {
        0: {
          request: constructEmptyRequest(),
          children: {
            1: {
              request: constructEmptyRequest(),
              children: {
                2: {
                  request: constructEmptyRequest(),
                  children: {}
                },
                3: {
                  request: constructEmptyRequest(),
                  children: {}
                }
              }
            }
          }
        },
        4: {
          request: constructEmptyRequest(),
          children: {
            5: {
              request: constructEmptyRequest(),
              children: {
                7: {
                  request: constructEmptyRequest(),
                  children: {
                    8: {
                      request: constructEmptyRequest(),
                      children: {}
                    }
                  }
                },
                6: {
                  request: constructEmptyRequest(),
                  children: {}
                }
              }
            }
          }
        }
      }
    }));

  it('handles redirects', () => {
    const networkRecords = mockTracingData([HIGH, HIGH, HIGH], [[0, 1], [1, 2]]);

    // Make a fake redirect
    networkRecords[1].requestId = '1:redirected.0';
    networkRecords[2].requestId = '1';
    return Gatherer.request(networkRecords).then(criticalChains => {
      assert.deepEqual(criticalChains, {
        0: {
          request: constructEmptyRequest(),
          children: {
            '1:redirected.0': {
              request: constructEmptyRequest(),
              children: {
                1: {
                  request: constructEmptyRequest(),
                  children: {}
                }
              }
            }
          }
        }
      });
    });
  });

  it('discards favicons as non-critical', () => {
    const networkRecords = mockTracingData([HIGH, HIGH, HIGH], [[0, 1], [0, 2]]);

    // 2nd record is a favicon
    networkRecords[1].url = 'https://example.com/favicon.ico';
    networkRecords[1].parsedURL = {
      lastPathComponent: 'favicon.ico'
    };
    // 3rd record is also a favicon
    networkRecords[2].mimeType = 'image/x-icon';
    return Gatherer.request(networkRecords).then(criticalChains => {
      assert.deepEqual(criticalChains, {
        0: {
          request: constructEmptyRequest(),
          children: {}
        }
      });
    });
  });

  it('handles non-existent nodes when building the tree', () => {
    const networkRecords = mockTracingData([HIGH, HIGH], [[0, 1]]);

    // Reverse the records so we force nodes to be made early.
    networkRecords.reverse();
    return Gatherer.request(networkRecords).then(criticalChains => {
      assert.deepEqual(criticalChains, {
        0: {
          request: constructEmptyRequest(),
          children: {
            1: {
              request: constructEmptyRequest(),
              children: {}
            }
          }
        }
      });
    });
  });
});
