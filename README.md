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

    npm build - builds the module.
    npm build-analytics - builds the module with analytics support.
    npm watch - auto-builds the module whenever any source changes.


# Updating the npm entry

Once changes are made, a new version can be published to the index using the
following commands:

    npm version <NEW_VERSION>
    npm publish
    git push
