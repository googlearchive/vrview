/*
 * Copyright 2016 Google Inc. All Rights Reserved.
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
var AdaptivePlayer = require('./adaptive-player');
var Emitter = require('../emitter');
var Eyes = require('./eyes');
var HotspotRenderer = require('./hotspot-renderer');
var ReticleRenderer = require('./reticle-renderer');
var SphereRenderer = require('./sphere-renderer');
var TWEEN = require('tween.js');
var Util = require('../util');
var VertexDistorter = require('./vertex-distorter');
var VideoProxy = require('./video-proxy');
var WebVRManager = require('webvr-boilerplate');

var AUTOPAN_DURATION = 3000;
var AUTOPAN_ANGLE = 0.4;

/**
 * The main WebGL rendering entry point. Manages the scene, camera, VR-related
 * rendering updates. Interacts with the WebVRManager.
 *
 * Coordinates the other renderers: SphereRenderer, HotspotRenderer,
 * ReticleRenderer.
 *
 * Also manages the AdaptivePlayer and VideoProxy.
 *
 * Emits the following events:
 *   load: when the scene is loaded.
 *   error: if there is an error loading the scene.
 *   modechange: if the mode (eg. VR, fullscreen, etc) changes.
 */
function WorldRenderer() {
  this.init_();

  this.sphereRenderer = new SphereRenderer(this.scene, this.distorter);
  this.hotspotRenderer = new HotspotRenderer(this.scene);
  this.hotspotRenderer.on('focus', this.onHotspotFocus_.bind(this));
  this.hotspotRenderer.on('blur', this.onHotspotBlur_.bind(this));
  this.reticleRenderer = new ReticleRenderer(this.camera);
}
WorldRenderer.prototype = new Emitter();

WorldRenderer.prototype.render = function(time) {
  this.controls.update();
  this.hotspotRenderer.update(this.camera);
  TWEEN.update(time);
  this.effect.render(this.scene, this.camera);
};

WorldRenderer.prototype.setScene = function(scene) {
  var self = this;
  if (!scene || !scene.isComplete()) {
    this.emit('error', 'Scene failed to load');
    return;
  }

  var params = {
    isStereo: scene.isStereo,
  }
  this.setDefaultHeading_(scene.defaultHeading || 0);

  // Disable VR mode if explicitly disabled, or if we're loading a video on iOS
  // 9 or earlier.
  if (scene.isVROff || (scene.video && Util.isIOS9OrLess())) {
    this.manager.setVRCompatibleOverride(false);
  }

  // If we're dealing with an image, and not a video.
  if (scene.image && !scene.video) {
    if (scene.preview) {
      // First load the preview.
      this.sphereRenderer.setPhotosphere(scene.preview, params).then(function() {
        // As soon as something is loaded, emit the load event to hide the
        // loading progress bar.
        self.didLoad_();
        // Then load the full resolution image.
        self.sphereRenderer.setPhotosphere(scene.image, params);
      });
    } else {
      // No preview -- go straight to rendering the full image.
      this.sphereRenderer.setPhotosphere(scene.image, params).then(function() {
        self.didLoad_();
      });
    }
  } else if (scene.video) {
    if (Util.isIE11()) {
      // On iOS and IE 11, if an 'image' param is provided, load it instead of
      // showing an error.
      //
      // TODO(smus): Once video textures are supported, remove this fallback.
      if (scene.image) {
        this.sphereRenderer.setPhotosphere(scene.image, params).then(function() {
          self.didLoad_();
        });
      } else {
        this.emit('error', 'Video is not supported on IE11.');
      }
    } else {
      var player = new AdaptivePlayer();
      player.on('load', function(videoElement) {
        self.sphereRenderer.set360Video(videoElement, params).then(function() {
          self.didLoad_({videoElement: videoElement});
        });
      });
      player.on('error', function(error) {
        self.emit('error', 'Video load error: ' + error);
      });
      player.load(scene.video);

      this.videoProxy = new VideoProxy(player.video);
    }
  }

  this.sceneInfo = scene;
  console.log('Loaded scene', scene);
};

WorldRenderer.prototype.didLoad_ = function(opt_event) {
  var event = opt_event || {};
  this.emit('load', event);

  // Autopan on desktop only.
  if (!Util.isMobile() && !this.sceneInfo.isAutopanOff) {
    this.autopan_();
  }
};

/**
 * Sets the default heading.
 * @param {Number} angleRad The heading in radians.
 */
WorldRenderer.prototype.setDefaultHeading_ = function(angleRad) {
  // Rotate the camera parent to take into account the scene's rotation.
  // By default, it should be at the center of the image.
  this.camera.parent.rotation.y = (Math.PI / 2.0) + angleRad;
};

/**
 * Do the initial camera tween to rotate the camera, giving an indication that
 * there is live content there (on desktop only).
 */
WorldRenderer.prototype.autopan_ = function(duration) {
  var targetY = this.camera.parent.rotation.y - AUTOPAN_ANGLE;
  var tween = new TWEEN.Tween(this.camera.parent.rotation)
      .to({y: targetY}, AUTOPAN_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
};

WorldRenderer.prototype.init_ = function() {
  var container = document.querySelector('body');
  var aspect = window.innerWidth / window.innerHeight;
  var camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
  camera.layers.enable(1);

  var cameraDummy = new THREE.Object3D();
  cameraDummy.add(camera);

  // Antialiasing disabled to improve performance.
  var renderer = new THREE.WebGLRenderer({antialias: false});
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  container.appendChild(renderer.domElement);

  var controls = new THREE.VRControls(camera);
  var effect = new THREE.VREffect(renderer);

  // The vertex distorter.
  this.distorter = new VertexDistorter();

  // Disable eye separation.
  effect.scale = 0;
  effect.setSize(window.innerWidth, window.innerHeight);

  this.camera = camera;
  this.renderer = renderer;
  this.effect = effect;
  this.controls = controls;
  this.manager = new WebVRManager(renderer, effect, {predistorted: true});
  this.manager.on('modechange', this.onModeChange_.bind(this));

  this.scene = this.createScene_();
  this.scene.add(this.camera.parent);


  // Watch the resize event.
  window.addEventListener('resize', this.onResize_.bind(this));

  // Watch the custom vrdisplaydeviceparamschange event, which fires whenever
  // the viewer parameters change.
  window.addEventListener('vrdisplaydeviceparamschange',
                          this.onVRDisplayParamsChange_.bind(this));

  window.addEventListener('vrdisplaypresentchange',
                          this.onVRDisplayPresentChange_.bind(this));
};

WorldRenderer.prototype.onResize_ = function() {
  this.effect.setSize(window.innerWidth, window.innerHeight);
  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();
};

WorldRenderer.prototype.onVRDisplayParamsChange_ = function(e) {
  console.log('onVRDisplayParamsChange_');
  this.distorter.setDeviceInfo(e.detail.deviceInfo);
  this.sphereRenderer.updateMaterial();
};

WorldRenderer.prototype.onVRDisplayPresentChange_ = function(e) {
  console.log('onVRDisplayPresentChange_');
  var vrDisplay = e.detail.vrdisplay;
  var isVRMode = vrDisplay.isPresenting;
  if (vrDisplay.isPolyfilled) {
    this.distorter.setEnabled(isVRMode);
    this.sphereRenderer.updateMaterial();
  }

  // Resize the renderer for good measure.
  this.onResize_();
};

WorldRenderer.prototype.createScene_ = function(opt_params) {
  var scene = new THREE.Scene();

  // Add a group for the photosphere.
  var photoGroup = new THREE.Object3D();
  photoGroup.name = 'photo';
  scene.add(photoGroup);

  return scene;
};

WorldRenderer.prototype.onModeChange_ = function(mode) {
  // Analytics.
  if (window.analytics) {
    analytics.logModeChanged(mode);
  }
  this.emit('modechange', mode);
};

WorldRenderer.prototype.onHotspotFocus_ = function(id) {
  console.log('onHotspotFocus_', id);
  // Show the reticle.
  //this.reticleRenderer.setVisibility(true);
};

WorldRenderer.prototype.onHotspotBlur_ = function(id) {
  console.log('onHotspotBlur_', id);
  // Hide the reticle.
  //this.reticleRenderer.setVisibility(false);
};


module.exports = WorldRenderer;
