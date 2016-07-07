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

  this.hotspots = {};
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
  // If a hotspot already exists with this ID, stop.
  if (this.hotspots[id]) {
    console.error('Attempt to add hotspot with existing id %s.', id);
    return;
  }

  // Calculate the appropriate geometry corresponding to the specified
  // coordinates.
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
};

HotspotRenderer.prototype.update = function(camera) {
  // Do some raycasting.
};

HotspotRenderer.prototype.onTouchEnd_ = function() {
  // If a hotspot is selected, emit a click event.
};

module.exports = HotspotRenderer;
