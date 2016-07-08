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
  window.addEventListener('touchend', this.onTouchEnd_.bind(this));
  window.addEventListener('keyup', this.onKeyUp_.bind(this));

  // Add a placeholder for hotspots.
  this.hotspotRoot = new THREE.Object3D();
  this.scene.add(this.hotspotRoot);

  // All hotspot IDs.
  this.hotspots = {};

  // Currently selected hotspots.
  this.selectedHotspots = {};

  // For raycasting.
  this.center = new THREE.Vector2();
  this.raycaster = new THREE.Raycaster();

  // Hide by default.
  this.setVisibility(false);
}
HotspotRenderer.prototype = new Emitter();

/**
 * Adds a new hotspot given two coordinates and an ID.
 *
 * @param c1 {Coordinate} Coordinate of one extreme.
 * @param c2 {Coordinate} Coordinate of another extreme.
 * @param id {String} Identifier of the hotspot.
 */
HotspotRenderer.prototype.add = function(c1, c2, id) {
  console.log('HotspotRenderer.add', c1, c2, id);
  // If a hotspot already exists with this ID, stop.
  if (this.hotspots[id]) {
    console.error('Attempt to add hotspot with existing id %s.', id);
    return;
  }

  // Calculate the appropriate geometry and size corresponding to the specified
  // coordinates.
  var top = Math.min(c1.lat, c2.lat) + Math.PI/2;
  var right = Math.max(c1.lon, c2.lon);
  // Convert lat to be zero at equator.
  var bottom = Math.max(c1.lat, c2.lat) + Math.PI/2;
  var left = Math.min(c1.lon, c2.lon);
  console.log(top, right, bottom, left);

  var phiStart = left;
  var phiLength = Math.abs(left - right);
  var thetaStart = top;
  var thetaLength = Math.abs(top - bottom);
  var geometry = new THREE.SphereGeometry(0.99, 48, 48,
                                          phiStart, phiLength, thetaStart, thetaLength);
                                          
  var material = new THREE.MeshBasicMaterial({color: 0xffff00, side: THREE.BackSide});
  material.transparent = true;
  material.opacity = 0.5;

  var hotspot = new THREE.Mesh(geometry, material);
  hotspot.name = id;
  
  this.hotspotRoot.add(hotspot);
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
  this.raycaster.setFromCamera(this.center, camera);	

  // Go through all hotspots to see if they are currently selected.
  var hotspots = this.hotspotRoot.children;
  for (var i = 0; i < hotspots.length; i++) {
    var hotspot = hotspots[i];
    var id = hotspot.name;
    // Check if hotspot is intersected with the picking ray.
    var intersects = this.raycaster.intersectObject(hotspot);
    var isIntersected = (intersects.length > 0);

    // If newly selected, emit a focus event.
    if (isIntersected && !this.selectedHotspots[id]) {
      this.emit('focus', id);
    }
    // If no longer selected, emit a blur event.
    if (!isIntersected && this.selectedHotspots[id]) {
      this.emit('blur', id);
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

HotspotRenderer.prototype.onTouchEnd_ = function() {
  // If a hotspot is selected, emit a click event.
  for (var id in this.selectedHotspots) {
    this.emit('click', id);
  }
};

HotspotRenderer.prototype.onKeyUp_ = function(e) {
  if (e.keyCode == 32) { // Space
    for (var id in this.selectedHotspots) {
      this.emit('click', id);
    }
  }
};

module.exports = HotspotRenderer;
