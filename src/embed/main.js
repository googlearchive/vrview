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

// Initialize the loading indicator as quickly as possible to give the user
// immediate feedback.
var LoadingIndicator = require('./loading-indicator');
var loadIndicator = new LoadingIndicator();

var ES6Promise = require('es6-promise');
// Polyfill ES6 promises for IE.
ES6Promise.polyfill();

var AdaptivePlayer = require('./adaptive-player');
var IFrameMessageReceiver = require('./iframe-message-receiver');
var PhotosphereRenderer = require('./photosphere-renderer');
var SceneLoader = require('./scene-loader');
var Stats = require('../../node_modules/stats-js/build/stats.min');
var Util = require('../util');
var VideoProxy = require('./video-proxy');
var WebVRPolyfill = require('webvr-polyfill');

var receiver = new IFrameMessageReceiver();

window.addEventListener('load', onLoad);

var stats = new Stats();

var loader = new SceneLoader();
loader.on('error', onSceneError);
loader.on('load', onSceneLoad);

var renderer = new PhotosphereRenderer();
renderer.on('error', onRenderError);
renderer.on('modechange', onModeChange);

var videoProxy = null;
var loadedScene = null;

function onLoad() {
  if (!Util.isWebGLEnabled()) {
    showError('WebGL not supported.');
    return;
  }
  // Load the scene.
  loader.loadScene();

  if (Util.getQueryParameter('debug')) {
    showStats();
  }
  requestAnimationFrame(loop);
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
    if (Util.isIE11()) {
      // On iOS and IE 11, if an 'image' param is provided, load it instead of
      // showing an error.
      //
      // TODO(smus): Once video textures are supported, remove this fallback.
      if (scene.image) {
        loadImage(scene.image, params);
      } else {
        showError('Video is not supported on IE11.');
      }
    } else {
      var player = new AdaptivePlayer();
      player.on('load', onVideoLoad);
      player.on('error', onVideoLoad);
      player.load(scene.video);

      videoProxy = new VideoProxy(player.video);
    }
  } else if (scene.image) {
    // Otherwise, just render the photosphere.
    loadImage(scene.image, params);
  }

  console.log('Loaded scene', scene);
}

function onVideoLoad(video) {
  console.log('onVideoLoad');
  // Render the stereo video.
  var params = {
    isStereo: loadedScene.isStereo,
  }
  loadIndicator.hide();

  renderer.set360Video(video, params);

  // On mobile, tell the user they need to tap to start. Otherwise, autoplay.
  if (Util.isMobile()) {
    // Tell user to tap to start.
    showPlayButton();
    document.body.addEventListener('touchend', onVideoTap);
  } else {
    video.play();
  }
}

function onVideoTap() {
  videoProxy.play();
  hidePlayButton();

  // Prevent multiple play() calls on the video element.
  document.body.removeEventListener('touchend', onVideoTap);
}

function onRenderLoad() {
  // Hide loading indicator.
  loadIndicator.hide();
}

function onModeChange(mode) {
  var message = {
    type: 'modechange',
    data: mode
  }
  parent.postMessage(message, '*');
};

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

function showPlayButton() {
  var playButton = document.querySelector('#play-overlay');
  playButton.classList.add('visible');
}

function hidePlayButton() {
  var playButton = document.querySelector('#play-overlay');
  playButton.classList.remove('visible');
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
  // Update the video if needed.
  if (videoProxy) {
    videoProxy.update(time);
  }
  renderer.render(time);
  stats.end();
  requestAnimationFrame(loop);
}
