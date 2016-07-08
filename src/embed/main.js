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

var Coordinate = require('../coordinate');
var IFrameMessageReceiver = require('./iframe-message-receiver');
var Message = require('../message');
var SceneLoader = require('./scene-loader');
var Stats = require('../../node_modules/stats-js/build/stats.min');
var Util = require('../util');
var WebVRPolyfill = require('webvr-polyfill');
var WorldRenderer = require('./world-renderer');

var receiver = new IFrameMessageReceiver();
receiver.on(Message.PLAY, onPlay);
receiver.on(Message.PAUSE, onPause);
receiver.on(Message.ADD_HOTSPOT, onAddHotspot);

window.addEventListener('load', onLoad);

var stats = new Stats();

var loader = new SceneLoader();
loader.on('error', onSceneError);
loader.on('load', onSceneLoad);

// TODO(smus): Var-ify.
worldRenderer = new WorldRenderer();
worldRenderer.on('error', onRenderError);
worldRenderer.on('load', onRenderLoad);
worldRenderer.on('modechange', onModeChange);
worldRenderer.hotspotRenderer.on('click', onHotspotClick);

function onLoad() {
  if (!Util.isWebGLEnabled()) {
    showError('WebGL not supported.');
    return;
  }
  // Load the scene.
  loader.loadScene();

  requestAnimationFrame(loop);
}

function onSceneLoad(scene) {
  worldRenderer.setScene(scene);

  if (scene.isDebug) {
    // Show stats.
    showStats();
    // Make hotspots visible.
    worldRenderer.hotspotRenderer.setVisibility(true);
  }

  if (scene.isYawOnly) {
    WebVRConfig = window.WebVRConfig || {};
    WebVRConfig.YAW_ONLY = true;
  }
}


function onVideoTap() {
  worldRenderer.videoProxy.play();
  hidePlayButton();

  // Prevent multiple play() calls on the video element.
  document.body.removeEventListener('touchend', onVideoTap);
}

function onRenderLoad(event) {
  if (event.videoElement) {
    // On mobile, tell the user they need to tap to start. Otherwise, autoplay.
    if (Util.isMobile()) {
      // Tell user to tap to start.
      showPlayButton();
      document.body.addEventListener('touchend', onVideoTap);
    } else {
      event.videoElement.play();
    }
  }
  // Hide loading indicator.
  loadIndicator.hide();

  Util.sendParentMessage({
    type: 'ready' 
  });
}

function onPlay() {
  if (!worldRenderer.videoProxy) {
    console.error('Attempt to play, but no video found.');
    return;
  }
  worldRenderer.videoProxy.play();
}

function onPause() {
  if (!worldRenderer.videoProxy) {
    console.error('Attempt to pause, but no video found.');
    return;
  }
  worldRenderer.videoProxy.pause();
}

function onAddHotspot(e) {
  console.log('onAddHotspot', e);

  var c1 = Coordinate.fromObject(e.c1);
  var c2 = Coordinate.fromObject(e.c2);
  var id = e.id;
  worldRenderer.hotspotRenderer.add(c1, c2, id);
}

function onModeChange(mode) {
  Util.sendParentMessage({
    type: 'modechange',
    data: {mode: mode}
  });
}

function onHotspotClick(id) {
  Util.sendParentMessage({
    type: 'click',
    data: {id: id}
  });
};

function onSceneError(message) {
  showError('Loader: ' + message);
}

function onRenderError(message) {
  showError('Render: ' + message);
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
  if (worldRenderer.videoProxy) {
    worldRenderer.videoProxy.update(time);
  }
  worldRenderer.render(time);
  stats.end();
  requestAnimationFrame(loop);
}
