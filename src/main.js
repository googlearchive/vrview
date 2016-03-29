/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Disable distortion provided by the boilerplate because we are doing
// vertex-based distortion.
WebVRConfig = window.WebVRConfig || {}
WebVRConfig.PREVENT_DISTORTION = true;

// Initialize the loading indicator as quickly as possible to give the user
// immediate feedback.
var LoadingIndicator = require('./loading-indicator');
var loadIndicator = new LoadingIndicator();

// Include relevant polyfills.
require('../node_modules/webvr-polyfill/build/webvr-polyfill');
var ES6Promise = require('../node_modules/es6-promise/dist/es6-promise.min');
// Polyfill ES6 promises for IE.
ES6Promise.polyfill();

var PhotosphereRenderer = require('./photosphere-renderer');
var SceneLoader = require('./scene-loader');
var Stats = require('../node_modules/stats-js/build/stats.min');
var Util = require('./util');

// Include the DeviceMotionReceiver for the iOS cross domain iframe workaround.
// This is a workaround for https://bugs.webkit.org/show_bug.cgi?id=150072.
var DeviceMotionReceiver = require('./device-motion-receiver');
var dmr = new DeviceMotionReceiver();


window.addEventListener('load', init);

var stats = new Stats();

var loader = new SceneLoader();
loader.on('error', onSceneError);
loader.on('load', onSceneLoad);

var renderer = new PhotosphereRenderer();
renderer.on('error', onRenderError);

var videoElement = null;
// TODO: Make this not global.
// Currently global in order to allow callbacks.
var loadedScene = null;

function init() {
  if (!Util.isWebGLEnabled()) {
    showError('WebGL not supported.');
    return;
  }
  // Load the scene.
  loader.loadScene();

  if (Util.getQueryParameter('debug')) {
    showStats();
  }
}

function loadImage(src, params) {
  renderer.on('load', onRenderLoad);
  renderer.setPhotosphere(src, params);
}

function onSceneLoad(scene) {
  if (!scene || !scene.isComplete()) {
    showError('Scene failed to load');
    return;
  }

  loadedScene = scene;

  var params = {
    isStereo: scene.isStereo,
  }
  renderer.setDefaultLookDirection(scene.yaw || 0);

  if (scene.preview) {
    var onPreviewLoad = function() {
      loadIndicator.hide();
      renderer.removeListener('load', onPreviewLoad);
      renderer.setPhotosphere(scene.image, params);
    }
    renderer.removeListener('load', onRenderLoad);
    renderer.on('load', onPreviewLoad);
    renderer.setPhotosphere(scene.preview, params);
  } else if (scene.video) {
    if (Util.isIOS() || Util.isIE11()) {
      // On iOS and IE 11, if an 'image' param is provided, load it instead of
      // showing an error.
      //
      // TODO(smus): Once video textures are supported, remove this fallback.
      if (scene.image) {
        loadImage(scene.image, params);
      } else {
        showError('Video is not supported on this platform (iOS or IE11).');
      }
    } else {
      // Load the video element.
      videoElement = document.createElement('video');
      videoElement.src = scene.video;
      videoElement.loop = true;
      videoElement.setAttribute('crossorigin', 'anonymous');
      videoElement.addEventListener('canplaythrough', onVideoLoad);
      videoElement.addEventListener('error', onVideoError);
    }
  } else if (scene.image) {
    // Otherwise, just render the photosphere.
    loadImage(scene.image, params);
  }

  console.log('Loaded scene', scene);
}

function onVideoLoad() {
  // Render the stereo video.
  var params = {
    isStereo: loadedScene.isStereo,
  }
  renderer.set360Video(videoElement, params);

  // On mobile, tell the user they need to tap to start. Otherwise, autoplay.
  if (!Util.isMobile()) {
    // Hide loading indicator.
    loadIndicator.hide();
    // Autoplay the video on desktop.
    videoElement.play();
  } else {
    // Tell user to tap to start.
    showError('Tap to start video', 'Play');
    document.body.addEventListener('touchend', onVideoTap);
  }

  // Prevent onVideoLoad from firing multiple times.
  videoElement.removeEventListener('canplaythrough', onVideoLoad);
}

function onVideoTap() {
  hideError();
  videoElement.play();

  // Prevent multiple play() calls on the video element.
  document.body.removeEventListener('touchend', onVideoTap);
}

function onRenderLoad() {
  // Hide loading indicator.
  loadIndicator.hide();
}

function onSceneError(message) {
  showError('Loader: ' + message);
}

function onRenderError(message) {
  showError('Render: ' + message);
}

function onVideoError(e) {
  showError('Video load error');
  console.log(e);
}

function showError(message, opt_title) {
  // Hide loading indicator.
  loadIndicator.hide();

  var error = document.querySelector('#error');
  error.classList.add('visible');
  error.querySelector('.message').innerHTML = message;

  var title = (opt_title !== undefined ? opt_title : 'Error');
  error.querySelector('.title').innerHTML = title;
}

function hideError() {
  var error = document.querySelector('#error');
  error.classList.remove('visible');
}

function showStats() {
  stats.setMode(0); // 0: fps, 1: ms

  // Align bottom-left.
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.bottom = '0px';
  document.body.appendChild(stats.domElement);
}

function loop(time) {
  stats.begin();
  renderer.render(time);
  stats.end();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
