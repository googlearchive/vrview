# VR View

[![Build Status](https://travis-ci.org/googlevr/vrview.svg?branch=master)](https://travis-ci.org/googlevr/vrview)
[![dependencies Status](https://david-dm.org/googlevr/vrview/status.svg)](https://david-dm.org/googlevr/vrview)
[![devDependencies Status](https://david-dm.org/googlevr/vrview/dev-status.svg)](https://david-dm.org/googlevr/vrview?type=dev)

VR View allows you to embed 360 degree VR media into websites on desktop and
mobile. For more information, please read the documentation available at
<http://developers.google.com/cardboard/vrview>.

# Configuration

A complete list of VR View parameters can be found in the table below.

Name | Type | Parameter description
---- | ---- | ---------------------
`video` | String | URL to a 360° video file or an adaptive streaming manifest file (.mpd or .m3u8). Exactly one of video or image is required.
`image` | String | URL to a 360° image file. Exactly one of video or image is required.
`width` | String | String value for the iframe's width attribute.
`height` | String | String value for the iframe's height attribute.
`preview` | String | (Optional) URL to a preview image for a 360° image file.
`is_stereo` | Boolean | (Optional) Indicates whether the content at the image or video URL is stereo or not.
`is_debug` | Boolean | (Optional) When true, turns on debug features like rendering hotspots ad showing the FPS meter.
`is_vr_off` | Boolean | (Optional) When true, disables the VR mode button.
`is_autopan_off` | Boolean | (Optional) When true, disables the autopan introduction on desktop.
`default_yaw` | Number | (Optional) Numeric angle in degrees of the initial heading for the 360° content. By default, the camera points at the center of the underlying image.
`is_yaw_only` | Boolean | (Optional) When true, prevents roll and pitch. This is intended for stereo panoramas.
`loop` | Boolean | (Optional) When false, stops the loop in the video.
`hide_fullscreen_button` | Boolean | (Optional) When true, the fullscreen button contained inside the VR View iframe will be hidden. This parameter is useful if the user wants to use VR View's fullscreen workflow (via `vrView.setFullscreen()` callback) with an element outside the iframe. 
`volume` | Number | (Optional) The initial volume of the media; it ranges between 0 and 1; zero equals muted.
`muted` | Boolean | (Optional) When true, mutes the sound of the video.

# Downloading files

The `gh-pages` branch hosts the built files. Download these instead of linking to these
locations, since the directory structure of the repo may change in the future.

* [https://googlevr.github.io/vrview/build/vrview.js](https://googlevr.github.io/vrview/build/vrview.js)
* [https://googlevr.github.io/vrview/build/vrview.min.js](https://googlevr.github.io/vrview/build/vrview.min.js)
* [https://googlevr.github.io/vrview/build/embed.js](https://googlevr.github.io/vrview/build/embed.js)
* [https://googlevr.github.io/vrview/build/embed.min.js](https://googlevr.github.io/vrview/build/embed.min.js)
* [https://googlevr.github.io/vrview/build/three.js](https://googlevr.github.io/vrview/build/three.js)
* [https://googlevr.github.io/vrview/build/three.min.js](https://googlevr.github.io/vrview/build/three.min.js)
* [https://googlevr.github.io/vrview/build/device-motion-sender.min.js](https://googlevr.github.io/vrview/build/device-motion-sender.min.js)

# Building

This project uses `browserify` to manage dependencies and build. `watchify` is
especially convenient to preserve the write-and-reload model of development.
This package lives in the npm index.

**Current builds are not working on Windows ([#261](https://github.com/googlevr/vrview/issues/261))**

Relevant commands:
```shell
$ npm run build # builds the iframe embed and JS API (full and minified versions).

# Building

This project uses `browserify` to manage dependencies and build. `watchify` is
especially convenient to preserve the write-and-reload model of development.
This package lives in the npm index.

Relevant commands:
```shell
$ npm run build # builds the iframe embed and JS API (full and minified versions).
$ npm run build-api # builds the JS API (full and minified versions).

$ npm run build-min # builds the minified iframe embed.
$ npm run build-dev # builds the full iframe embed.

$ npm run build-api-min # builds the minified JS API.
$ npm run build-api-dev # builds the full JS API.

$ npm run watch # auto-builds the iframe embed whenever any source changes.
$ npm run watch-api # auto-builds the JS API code whenever any source changes.
```
As of 2017/06/13, the pre-built js artifacts have been removed from source
control. You must run `npm run build` prior to trying any of the examples.
