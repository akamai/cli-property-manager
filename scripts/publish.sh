#!/bin/sh

# excludes file - this contains a wildcard pattern per line of files to exclude
EXCLUDES=scripts/file_excludes.txt


# now the actual transfer
rsync --exclude-from=$EXCLUDES --delete -av . ../../cli-promotional-deployment