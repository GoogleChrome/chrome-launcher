#!/bin/sh

if [[ x"$CHROMIUM_SOURCE_PATH" == x ]]; then 
	echo "You must set CHROMIUM_SOURCE_PATH environment variable" >&2
	exit 1
fi

python process_artifacts.py artifacts.log
"$CHROMIUM_SOURCE_PATH/tools/android/loading/analyze.py" png clovis-trace.log \
	--png_output="network-dependency-graph.png"