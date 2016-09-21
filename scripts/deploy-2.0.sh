#!/usr/bin/env sh
SCRIPT_DIR=`dirname $BASH_SOURCE`

gsutil cp index-minified.html gs://vrview/2.0/index.html
gsutil cp -r style.css build/ examples/ gs://vrview/2.0/
gsutil -m acl set -r $SCRIPT_DIR/acl.txt gs://vrview/2.0/
