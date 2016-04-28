# Copyright 2016 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import sys

if 'CHROMIUM_SOURCE_PATH' not in os.environ:
  print 'You must set the environment variable CHROMIUM_SOURCE_PATH'
  sys.exit(1)

CHROMIUM_SOURCE_PATH = os.environ['CHROMIUM_SOURCE_PATH']
sys.path.append(os.path.join(CHROMIUM_SOURCE_PATH, 'tools/android/loading'))

import json
import tracing as clovis_tracing
from request_track import RequestTrack


CLOVIS_TRACE_CATEGORIES = clovis_tracing.INITIAL_CATEGORIES

def create_tracing_track(trace_events):
  return {'events': [event for event in trace_events
            if event['cat'] in CLOVIS_TRACE_CATEGORIES
            or event['cat'] == '__metadata']}

def create_page_track(frame_load_events):
  events = [{'frame_id': e['frameId'], 'method': e['method']}
            for e in frame_load_events]
  return {'events': events}

def create_request_track(raw_network_events):
  request_track = RequestTrack(None)
  for event in raw_network_events:
    request_track.Handle(event['method'], event)
  return request_track.ToJsonDict()

def main():
  with open('artifacts.log', 'r') as f:
    artifacts = json.load(f)

  clovis_trace = {}
  clovis_trace['url'] = artifacts['url']
  clovis_trace['tracing_track'] = create_tracing_track(
    artifacts['traceContents'])
  clovis_trace['page_track'] = create_page_track(artifacts['frameLoadEvents'])
  clovis_trace['request_track'] = create_request_track(
                                    artifacts['rawNetworkEvents'])

  # Stubbing this to pass assertion for now
  # If the metadata is critical we can replicate the functionality of
  # `controller.ChromeControllerBase._StartConnection`
  # in lighthouse.
  clovis_trace['metadata'] = {}

  with open('clovis-trace.log', 'w') as f:
    json.dump(clovis_trace, f)

if __name__ == '__main__':
  main()
