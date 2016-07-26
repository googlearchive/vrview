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
var Coordinate = require('../coordinate');
var Emitter = require('../emitter');
var TWEEN = require('tween.js');

var NORMAL_SCALE = new THREE.Vector3(0.5, 0.5, 0.5);
var FOCUS_SCALE = new THREE.Vector3(0.6, 0.6, 0.6);
var FOCUS_DURATION = 200;
/**
 * Responsible for rectangular hot spots that the user can interact with.
 *
 * Specific duties:
 *   Adding and removing hotspots.
 *   Rendering the hotspots (debug mode only).
 *   Notifying when hotspots are interacted with.
 * 
 * Emits the following events:
 *   click (id): a hotspot is clicked.
 *   focus (id): a hotspot is focused.
 *   blur (id): a hotspot is no longer hovered over.
 */
function HotspotRenderer(scene) {
  this.scene = scene;
  if (!Util.isMobile()) {
    // Only enable mouse events on desktop.
    window.addEventListener('mousedown', this.onMouseDown_.bind(this));
    window.addEventListener('mousemove', this.onMouseMove_.bind(this));
    window.addEventListener('mouseup', this.onMouseUp_.bind(this));
  }
  window.addEventListener('touchstart', this.onTouchStart_.bind(this));
  window.addEventListener('touchmove', this.onTouchMove_.bind(this));
  window.addEventListener('touchend', this.onTouchEnd_.bind(this));

  // Add a placeholder for hotspots.
  this.hotspotRoot = new THREE.Object3D();
  // Align the center with the center of the camera too.
  this.hotspotRoot.rotation.y = Math.PI / 2;
  this.scene.add(this.hotspotRoot);

  // All hotspot IDs.
  this.hotspots = {};

  // Currently selected hotspots.
  this.selectedHotspots = {};

  // Hotspots that the last mousedown event happened for.
  this.mouseDownHotspots = {};

  // For raycasting.
  this.mouse = new THREE.Vector2();
  this.raycaster = new THREE.Raycaster();

  // Hide by default.
  this.setVisibility(false);
}
HotspotRenderer.prototype = new Emitter();

/**
 * @param pitch {Number} The latitude of center, specified in degrees, between
 * -90 and 90, with 0 at the horizon.
 * @param yaw {Number} The longitude of center, specified in degrees, between
 * -180 and 180, with 0 at the image center.
 * @param radius {Number} The radius of the hotspot, specified in degrees.
 * @param hotspotId {String} The ID of the hotspot.
 */
HotspotRenderer.prototype.add = function(pitch, yaw, radius, id) {
  console.log('HotspotRenderer.add', pitch, yaw, radius, id);
  // If a hotspot already exists with this ID, stop.
  if (this.hotspots[id]) {
    console.error('Attempt to add hotspot with existing id %s.', id);
    return;
  }
  // Calculate the radius (in m) of the target based on the angular radius
  // specified.
  var hotspot = this.createHotspot_(radius);
  hotspot.name = id;

  // Position the hotspot based on the pitch and yaw specified.
  var quat = new THREE.Quaternion();
  quat.setFromEuler(new THREE.Euler(THREE.Math.degToRad(pitch), THREE.Math.degToRad(yaw), 0));
  hotspot.position.applyQuaternion(quat);
  hotspot.lookAt(new THREE.Vector3());
  
  this.hotspotRoot.add(hotspot);
  this.hotspots[id] = hotspot;
}

/**
 * Removes a hotspot based on the ID.
 *
 * @param ID {String} Identifier of the hotspot to be removed.
 */
HotspotRenderer.prototype.remove = function(id) {
  // If there's no hotspot with this ID, fail.
  if (!this.hotspots[id]) { 
    console.error('Attempt to remove non-existing hotspot with id %s.', id);
    return;
  }
  // TODO(smus): Implement me!
  //this.hotspotRoot
};

HotspotRenderer.prototype.update = function(camera) {
  // Update the picking ray with the camera and mouse position.
  this.raycaster.setFromCamera(this.mouse, camera);	

  // Go through all hotspots to see if they are currently selected.
  var hotspots = this.hotspotRoot.children;
  for (var i = 0; i < hotspots.length; i++) {
    var hotspot = hotspots[i];
    //hotspot.lookAt(camera.position);
    var id = hotspot.name;
    // Check if hotspot is intersected with the picking ray.
    var intersects = this.raycaster.intersectObjects(hotspot.children);
    var isIntersected = (intersects.length > 0);

    // If newly selected, emit a focus event.
    if (isIntersected && !this.selectedHotspots[id]) {
      this.emit('focus', id);
      this.focus_(id);
    }
    // If no longer selected, emit a blur event.
    if (!isIntersected && this.selectedHotspots[id]) {
      this.emit('blur', id);
      this.blur_(id);
    }
    // Update the set of selected hotspots.
    if (isIntersected) {
      this.selectedHotspots[id] = true;
    } else {
      delete this.selectedHotspots[id];
    }
  }
};

/**
 * Toggle whether or not hotspots are visible.
 */
HotspotRenderer.prototype.setVisibility = function(isVisible) {
  this.hotspotRoot.visible = isVisible;
};

HotspotRenderer.prototype.onTouchStart_ = function(e) {
};

HotspotRenderer.prototype.onTouchMove_ = function(e) {
};

HotspotRenderer.prototype.onTouchEnd_ = function(e) {
  // If a hotspot is selected, emit a click event.
  for (var id in this.selectedHotspots) {
    this.emit('click', id);
  }
};

HotspotRenderer.prototype.onMouseDown_ = function(e) {
  this.mouseDownHotspots = {};
  for (var id in this.selectedHotspots) {
    this.mouseDownHotspots[id] = true;
  }
};

HotspotRenderer.prototype.onMouseMove_ = function(e) {
	this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
	this.mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;	
};

HotspotRenderer.prototype.onMouseUp_ = function(e) {
  // Only emit a click if the mouse was down on the same hotspot before.
  for (var id in this.selectedHotspots) {
    if (id in this.mouseDownHotspots) {
      this.emit('click', id);
    }
  }
};

HotspotRenderer.prototype.createHotspot_ = function(radius) {
  var radiusRad = THREE.Math.degToRad(radius);
  var circleRadius = Math.sin(radiusRad);
  var innerGeometry = new THREE.CircleGeometry(circleRadius * 0.85, 32);

  var innerMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.FrontSide,
                                             transparent: true, opacity: 0.9});

  var inner = new THREE.Mesh(innerGeometry, innerMaterial);

  var outerMaterial = new THREE.MeshBasicMaterial({color: 0x000000, side: THREE.DoubleSide});
  var outerGeometry = new THREE.RingGeometry(circleRadius * 0.85, circleRadius, 32);
  var outer = new THREE.Mesh(outerGeometry, outerMaterial);

  // Position at the extreme end of the sphere.
  var hotspot = new THREE.Object3D();
  hotspot.position.z = -Math.cos(radiusRad) / 2.0;
  hotspot.scale.set(NORMAL_SCALE);

  hotspot.add(inner);
  hotspot.add(outer);

  return hotspot;
};

HotspotRenderer.prototype.focus_ = function(id) {
  var hotspot = this.hotspots[id];

  // Tween scale of hotspot.
  this.tween = new TWEEN.Tween(hotspot.scale).to(FOCUS_SCALE, FOCUS_DURATION)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
};

HotspotRenderer.prototype.blur_ = function(id) {
  var hotspot = this.hotspots[id];

  this.tween = new TWEEN.Tween(hotspot.scale).to(NORMAL_SCALE, FOCUS_DURATION)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
};

module.exports = HotspotRenderer;
