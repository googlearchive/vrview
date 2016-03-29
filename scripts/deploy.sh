#!/usr/bin/env sh
SCRIPT_DIR=`dirname $BASH_SOURCE`

gsutil cp -r build/ images/ examples/ gs://vrview/
gsutil -m acl set -r $SCRIPT_DIR/acl.txt gs://vrview/
