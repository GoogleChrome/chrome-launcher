#!/usr/bin/env bash

FILES="`find . -type f \! -path '*node_modules*' \! -name '*.d.ts' -name '*.ts'`"

./node_modules/.bin/clang-format -i -style=file $FILES
