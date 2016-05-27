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

const GathererClass = require('../../../src/gatherers/critical-request-chains');
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
        initialPriority: () => priority,
        initiatorRequest: () => null}));

  // add mock initiator information
  edges.forEach(edge => {
    const initiator = networkRecords[edge[0]];
    networkRecords[edge[1]].initiatorRequest = () => initiator;
  });

  return networkRecords;
}

function testGetCriticalChain(data) {
  const networkRecords = mockTracingData(data.priorityList, data.edges);
  Gatherer.postProfiling(null, {networkRecords});
  const criticalChains = Gatherer.artifact;
  assert.deepEqual(criticalChains, data.expected);
}

function constructEmptyRequest() {
  return {
    endTime: undefined,
    responseReceivedTime: undefined,
    startTime: undefined,
    url: undefined
  };
}

describe('CriticalRequestChain gatherer: getCriticalChain function', () => {
  it('returns correct data for chain of four critical requests', () =>
    testGetCriticalChain({
      priorityList: [HIGH, MEDIUM, VERY_HIGH, HIGH],
      edges: [[0, 1], [1, 2], [2, 3]],
      expected: {
        criticalRequestChains: {
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
      }
    }));

  it('returns correct data for chain interleaved with non-critical requests',
    () => testGetCriticalChain({
      priorityList: [MEDIUM, HIGH, LOW, MEDIUM, HIGH, VERY_LOW],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
      expected: {
        criticalRequestChains: {
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
      }
    }));

  it('returns correct data for two parallel chains', () =>
    testGetCriticalChain({
      priorityList: [HIGH, HIGH, HIGH, HIGH],
      edges: [[0, 2], [1, 3]],
      expected: {
        criticalRequestChains: {
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
      }
    }));

  it('returns correct data for fork at root', () =>
    testGetCriticalChain({
      priorityList: [HIGH, HIGH, HIGH],
      edges: [[0, 1], [0, 2]],
      expected: {
        criticalRequestChains: {
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
      }
    }));

  it('returns correct data for fork at non root', () =>
    testGetCriticalChain({
      priorityList: [HIGH, HIGH, HIGH, HIGH],
      edges: [[0, 1], [1, 2], [1, 3]],
      expected: {
        criticalRequestChains: {
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
      }
    }));

  it('returns empty chain list when no critical request', () =>
    testGetCriticalChain({
      priorityList: [LOW, LOW],
      edges: [[0, 1]],
      expected: {
        criticalRequestChains: {}
      }
    }));

  it('returns empty chain list when no request whatsoever', () =>
    testGetCriticalChain({
      priorityList: [],
      edges: [],
      expected: {
        criticalRequestChains: {}
      }
    }));

  it('returns two single node chains for two independent requests', () =>
    testGetCriticalChain({
      priorityList: [HIGH, HIGH],
      edges: [],
      expected: {
        criticalRequestChains: {
          0: {
            request: constructEmptyRequest(),
            children: {}
          },
          1: {
            request: constructEmptyRequest(),
            children: {}
          }
        }
      }
    }));

  it('returns correct data on a random big graph', () =>
    testGetCriticalChain({
      priorityList: Array(9).fill(HIGH),
      edges: [[0, 1], [1, 2], [1, 3], [4, 5], [5, 7], [7, 8], [5, 6]],
      expected: {
        criticalRequestChains: {
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
      }
    }));
});
