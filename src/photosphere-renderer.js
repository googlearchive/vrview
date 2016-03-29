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

var Emitter = require('./emitter');
var Eyes = require('./eyes');
var THREE = require('../node_modules/three/three');
THREE.VRControls = require('../node_modules/three/examples/js/controls/VRControls');
THREE.VREffect = require('../node_modules/three/examples/js/effects/VREffect');
var Util = require('./util');
var VertexDistorter = require('./vertex-distorter');
require('../node_modules/webvr-boilerplate/build/webvr-manager');

function PhotosphereRenderer() {
  this.init();
}
PhotosphereRenderer.prototype = new Emitter();

PhotosphereRenderer.prototype.init = function() {
  var container = document.querySelector('body');
  var camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 100);
  var cameraDummy = new THREE.Object3D();
  cameraDummy.add(camera);

  // Antialiasing temporarily disabled to improve performance.
  var renderer = new THREE.WebGLRenderer({antialias: false});
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Round down fractional DPR values for better performance.
  renderer.setPixelRatio(Math.floor(window.devicePixelRatio));
  container.appendChild(renderer.domElement);

  var controls = new THREE.VRControls(camera);
  var effect = new THREE.VREffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);

  this.camera = camera;
  this.renderer = renderer;
  this.effect = effect;
  this.controls = controls;
  this.manager = new WebVRManager(renderer, effect, {isUndistorted: true});

  this.initScenes_();

  // The vertex distorter.
  this.distorter = new VertexDistorter(this.manager.getDeviceInfo());

  this.manager.on('modechange', this.onModeChange_.bind(this));
  this.manager.on('viewerchange', this.onViewerChange_.bind(this));

  // Watch the resize event.
  window.addEventListener('resize', this.onResize_.bind(this));

  var that = this;
  navigator.getVRDevices().then(function(devices) {
    devices.forEach(function(device) {
      if (device instanceof HMDVRDevice) {
        that.hmd = device;
      }
    });
  });
};

PhotosphereRenderer.prototype.render = function(timestamp) {
  this.controls.update();
  this.manager.render(this.scenes, this.camera, timestamp);
};

PhotosphereRenderer.prototype.setDefaultLookDirection = function(phi) {
  // Rotate the camera parent to take into account the scene's rotation.
  this.camera.parent.rotation.y = phi;
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
  loader.load(src, this.onTextureLoaded_.bind(this), null,
              this.onTextureError_.bind(this));
};

PhotosphereRenderer.prototype.set360Video = function(videoElement, opt_params) {
  var params = opt_params || {};

  this.isStereo = !!params.isStereo;

  // Load the video texture.
  var videoTexture = new THREE.VideoTexture(videoElement);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.format = THREE.RGBFormat;
  videoTexture.generateMipmaps = false;
  videoTexture.needsUpdate = true;

  this.onTextureLoaded_(videoTexture);
};

PhotosphereRenderer.prototype.initScenes_ = function() {
  this.sceneLeft = this.createScene_();
  this.sceneRight = this.createScene_();
  this.sceneLeft.add(this.camera.parent);

  this.scenes = [this.sceneLeft, this.sceneRight];
  this.eyes = [Eyes.LEFT, Eyes.RIGHT];
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

  this.sceneLeft.getObjectByName('photo').children = [sphereLeft];
  this.sceneRight.getObjectByName('photo').children = [sphereRight];

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
  // Add a light.
  scene.add(new THREE.PointLight(0xFFFFFF));

  // Add a group for the photosphere.
  var photoGroup = new THREE.Object3D();
  photoGroup.name = 'photo';
  scene.add(photoGroup);

  return scene;
};

PhotosphereRenderer.prototype.updateMaterial_ = function(material_FOO) {
  for (var i = 0; i < this.scenes.length; i++) {
    var eye = this.eyes[i];
    var material = this.distorter.getShaderMaterial(eye);
    var scene = this.scenes[i];
    var children = scene.getObjectByName('photo').children;
    for (var j = 0; j < children.length; j++) {
      var child = children[j];
      child.material = material;
      child.material.needsUpdate = true;
    }
  }
};

PhotosphereRenderer.prototype.updateRenderRect_ = function() {
  if (this.hmd && this.hmd.setRenderRect) {
    var deviceInfo = this.manager.getDeviceInfo();
    var leftRect = deviceInfo.getUndistortedViewportLeftEye();
    var dpr = window.devicePixelRatio;
    leftRect.x /= dpr;
    leftRect.y /= dpr;
    leftRect.width /= dpr;
    leftRect.height /= dpr;

    var rightRect = Util.clone(leftRect);
    rightRect.x = (window.innerWidth - leftRect.x) - leftRect.width;

    this.hmd.setRenderRect(leftRect, rightRect);
  }
};

PhotosphereRenderer.prototype.onModeChange_ = function(newMode, oldMode) {
  console.log('onModeChange_', newMode);

  var coefficients;
  if (newMode == WebVRManager.Modes.VR) {
    // Entering VR mode.
    this.distorter.setEnabled(true);
    this.updateMaterial_();
  } else if (oldMode == WebVRManager.Modes.VR) {
    // Leaving VR mode.
    this.distorter.setEnabled(false);
    this.updateMaterial_();
  }

  if (window.analytics) {
    analytics.logModeChanged(newMode);
  }
};

PhotosphereRenderer.prototype.onViewerChange_ = function(newViewer) {
  console.log('onViewerChange_', newViewer);

  // Reset the photosphere with new coefficients.
  this.updateMaterial_();
  this.updateRenderRect_();
};

PhotosphereRenderer.prototype.onResize_ = function() {
  this.updateRenderRect_();
};

module.exports = PhotosphereRenderer;
