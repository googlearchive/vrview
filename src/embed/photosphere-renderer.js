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

var Emitter = require('../emitter');
var Eyes = require('./eyes');
var Util = require('../util');
var VertexDistorter = require('./vertex-distorter');
var WebVRManager = require('webvr-boilerplate');

function PhotosphereRenderer() {
  this.init();
}
PhotosphereRenderer.prototype = new Emitter();

PhotosphereRenderer.prototype.init = function() {
  var container = document.querySelector('body');
  var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.layers.enable(1);

  var cameraDummy = new THREE.Object3D();
  cameraDummy.add(camera);

  // Antialiasing temporarily disabled to improve performance.
  var renderer = new THREE.WebGLRenderer({antialias: false});
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  container.appendChild(renderer.domElement);

  var controls = new THREE.VRControls(camera);
  var effect = new THREE.VREffect(renderer);
  // Disable eye separation.
  effect.scale = 0;
  effect.setSize(window.innerWidth, window.innerHeight);

  this.camera = camera;
  this.renderer = renderer;
  this.effect = effect;
  this.controls = controls;
  this.manager = new WebVRManager(renderer, effect, {predistorted: true});
  this.manager.on('modechange', this.onModeChange_.bind(this));

  this.initScenes_();

  // The vertex distorter.
  this.distorter = new VertexDistorter();

  // Watch the resize event.
  window.addEventListener('resize', this.onResize_.bind(this));

  // Watch the custom vrdisplaydeviceparamschange event, which fires whenever
  // the viewer parameters change.
  window.addEventListener('vrdisplaydeviceparamschange',
                          this.onVRDisplayParamsChange_.bind(this));

  window.addEventListener('vrdisplaypresentchange',
                          this.onVRDisplayPresentChange_.bind(this));
};

PhotosphereRenderer.prototype.render = function(timestamp) {
  this.controls.update();
  this.effect.render(this.scene, this.camera);
};

PhotosphereRenderer.prototype.setDefaultLookDirection = function(yaw) {
  // Rotate the camera parent to take into account the scene's rotation.
  // By default, it should be at the center of the image.
  this.camera.parent.rotation.y = (Math.PI / 2.0) + yaw;
};

/**
 * Sets the photosphere based on the image in the source. Supports stereo and
 * mono photospheres.
 *
 * Emits 'load' and 'error' events.
 */
PhotosphereRenderer.prototype.setPhotosphere = function(src, opt_params) {
  var params = opt_params || {};

  this.isStereo = !!params.isStereo;
  this.src = src;

  // Load texture.
  var loader = new THREE.TextureLoader();
  loader.crossOrigin = 'anonymous';
  loader.load(src, this.onTextureLoaded_.bind(this), undefined,
              this.onTextureError_.bind(this));
};

PhotosphereRenderer.prototype.set360Video = function(videoElement, opt_params) {
  // Disable video VR mode in iOS9 and below.
  if (Util.isIOS9OrLess()) {
    this.manager.setVRCompatibleOverride(false);
  }

  var params = opt_params || {};

  this.isStereo = !!params.isStereo;

  // Load the video texture.
  var videoTexture = new THREE.VideoTexture(videoElement);
  videoTexture.minFilter = THREE.NearestFilter;
  videoTexture.magFilter = THREE.NearestFilter;
  videoTexture.format = THREE.RGBFormat;
  videoTexture.generateMipmaps = false;
  videoTexture.needsUpdate = true;

  this.onTextureLoaded_(videoTexture);
};

PhotosphereRenderer.prototype.initScenes_ = function() {
  this.scene = this.createScene_();
  this.scene.add(this.camera.parent);
};

PhotosphereRenderer.prototype.onTextureLoaded_ = function(texture) {
  var sphereLeft;
  var sphereRight;
  if (this.isStereo) {
    sphereLeft = this.createPhotosphere_(texture, {offsetY: 0.5, scaleY: 0.5});
    sphereRight = this.createPhotosphere_(texture, {offsetY: 0, scaleY: 0.5});
  } else {
    sphereLeft = this.createPhotosphere_(texture);
    sphereRight = this.createPhotosphere_(texture);
  }

  // Display in left and right eye respectively.
  sphereLeft.layers.set(Eyes.LEFT);
  sphereLeft.eye = Eyes.LEFT;
  sphereRight.layers.set(Eyes.RIGHT);
  sphereRight.eye = Eyes.RIGHT;

  this.scene.getObjectByName('photo').children = [sphereLeft, sphereRight];

  this.emit('load');
};

PhotosphereRenderer.prototype.onTextureError_ = function(error) {
  this.emit('error', 'Unable to load texture from ' + this.src);
};


PhotosphereRenderer.prototype.createPhotosphere_ = function(texture, opt_params) {
  var p = opt_params || {};
  p.scaleX = p.scaleX || 1;
  p.scaleY = p.scaleY || 1;
  p.offsetX = p.offsetX || 0;
  p.offsetY = p.offsetY || 0;
  p.phiStart = p.phiStart || 0;
  p.phiLength = p.phiLength || Math.PI * 2;
  p.thetaStart = p.thetaStart || 0;
  p.thetaLength = p.thetaLength || Math.PI;

  var geometry = new THREE.SphereGeometry(1, 48, 48,
      p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
  geometry.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));
  var uvs = geometry.faceVertexUvs[0];
  for (var i = 0; i < uvs.length; i ++) {
    for (var j = 0; j < 3; j ++) {
      uvs[i][j].x *= p.scaleX;
      uvs[i][j].x += p.offsetX;
      uvs[i][j].y *= p.scaleY;
      uvs[i][j].y += p.offsetY;
    }
  }

  var material = new THREE.MeshBasicMaterial({ map: texture });
  this.distorter.setMap(texture);
  var out = new THREE.Mesh(geometry, material);
  out.renderOrder = -1;
  return out;
};

PhotosphereRenderer.prototype.createScene_ = function(opt_params) {
  var scene = new THREE.Scene();

  // Add a group for the photosphere.
  var photoGroup = new THREE.Object3D();
  photoGroup.name = 'photo';
  scene.add(photoGroup);

  return scene;
};

PhotosphereRenderer.prototype.updateMaterial_ = function() {
  var children = this.scene.getObjectByName('photo').children;
  for (var j = 0; j < children.length; j++) {
    var child = children[j];
    var material = this.distorter.getShaderMaterial(child.eye);
    child.material = material;
    child.material.needsUpdate = true;
  }
};

PhotosphereRenderer.prototype.onViewerChange_ = function(newViewer) {
  console.log('onViewerChange_', newViewer);

  // Reset the photosphere with new coefficients.
  this.updateMaterial_();
};

PhotosphereRenderer.prototype.onResize_ = function() {
  this.effect.setSize(window.innerWidth, window.innerHeight);
  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();
};

PhotosphereRenderer.prototype.onVRDisplayParamsChange_ = function(e) {
  console.log('onVRDisplayParamsChange_');
  this.distorter.setDeviceInfo(e.detail.deviceInfo);
};

PhotosphereRenderer.prototype.onVRDisplayPresentChange_ = function(e) {
  console.log('onVRDisplayPresentChange_');
  var vrDisplay = e.detail.vrdisplay;
  var isVRMode = vrDisplay.isPresenting;
  if (vrDisplay.isPolyfilled) {
    this.distorter.setEnabled(isVRMode);
    this.updateMaterial_();
  }

  // Resize the renderer for good measure.
  this.onResize_();
};

PhotosphereRenderer.prototype.onModeChange_ = function(mode) {
  // Analytics.
  if (window.analytics) {
    analytics.logModeChanged(mode);
  }
  this.emit('modechange', mode);
};

module.exports = PhotosphereRenderer;
