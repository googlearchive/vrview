VR View
=======

VR View allows you to embed 360 degree VR media into websites on desktop and
mobile. For more information, please read the documentation available at
<http://developers.google.com/cardboard/vrview>.

# Building

This project uses browserify to manage dependencies and build.  Watchify is
especially convenient to preserve the write-and-reload model of development.
This package lives in the npm index.

Relevant commands:

    npm build - builds the iframe embed.
    npm build-api - builds the JS API.
    npm watch - auto-builds the iframe embed whenever any source changes.
    npm watch-api - auto-builds the JS API code whenever any source changes.
