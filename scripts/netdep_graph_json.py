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
sys.path.insert(0, os.path.join(CHROMIUM_SOURCE_PATH, 'tools/android/loading'))

import json
import loading_trace
import content_classification_lens
import frame_load_lens
import activity_lens
import request_dependencies_lens
import loading_graph_view

def get_network_dependency_graph(json_dict):
  trace = loading_trace.LoadingTrace.FromJsonDict(json_dict)
  content_lens = (
      content_classification_lens.ContentClassificationLens.WithRulesFiles(
          trace, '', ''))
  frame_lens = frame_load_lens.FrameLoadLens(trace)
  activity = activity_lens.ActivityLens(trace)
  deps_lens = request_dependencies_lens.RequestDependencyLens(trace)
  graph_view = loading_graph_view.LoadingGraphView(
      trace, deps_lens, content_lens, frame_lens, activity)
  return graph_view

def main():
  with open('clovis-trace.log') as f:
    graph = get_network_dependency_graph(json.load(f))

  output_file = "dependency-graph.json"
  with open(output_file, 'w') as f:
    json.dump(graph.deps_graph.ToJsonDict(), f)
    print 'Wrote dependency graph to {0}'.format(output_file)

if __name__ == '__main__':
  main()
