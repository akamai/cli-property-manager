#!/usr/bin/env bash

jsfiles=`find src bin -name "*.js" | grep -v src/expression_parser.js | xargs`
echo "checking files: ${jsfiles}"
output=`./node_modules/.bin/js-beautify -r -f index.js ${jsfiles} | grep -v unchanged`

if [ $? -eq 1 ]
then
  echo "No files needed to be beautified."
  exit 0
else
  echo "Following files needed to be beautified:" >&2;
  echo "${output}" >&2;
  exit 1
fi
