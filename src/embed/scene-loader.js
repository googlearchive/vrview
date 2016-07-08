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
var SceneInfo = require('./scene-info');

var Query = {
  VIDEO_URL: 'video',
  OBJECT_URL: 'object',
  IMAGE_URL: 'image',
  PREVIEW_URL: 'preview',
  IS_STEREO: 'is_stereo',
  DEFAULT_HEADING: 'default_heading',
  IS_YAW_ONLY: 'is_yaw_only',
  IS_DEBUG: 'is_debug',
  IS_VR_OFF: 'is_vr_off',
  IS_AUTOPAN_OFF: 'is_autopan_off',
};

function SceneLoader() {
}
SceneLoader.prototype = new Emitter();

/**
 * Parse out GET parameters from the URL string and load the scene.
 */
SceneLoader.prototype.loadFromGetParams_ = function() {
  var params = {
    image: Util.getQueryParameter(Query.IMAGE_URL),
    video: Util.getQueryParameter(Query.VIDEO_URL),
    object: Util.getQueryParameter(Query.OBJECT_URL),
    preview: Util.getQueryParameter(Query.PREVIEW_URL),
    defaultHeading: THREE.Math.degToRad(Util.getQueryParameter(Query.DEFAULT_HEADING)),
    isStereo: this.parseBoolean_(Util.getQueryParameter(Query.IS_STEREO)),
    isYawOnly: this.parseBoolean_(Util.getQueryParameter(Query.IS_YAW_ONLY)),
    isDebug: this.parseBoolean_(Util.getQueryParameter(Query.IS_DEBUG)),
    isVROff: this.parseBoolean_(Util.getQueryParameter(Query.IS_VR_OFF)),
    isAutopanOff: this.parseBoolean_(Util.getQueryParameter(Query.IS_AUTOPAN_OFF)),
  };

  var count = 0;
  count += (params[Query.IMAGE_URL] ? 1 : 0);
  count += (params[Query.VIDEO_URL] ? 1 : 0);
  count += (params[Query.OBJECT_URL] ? 1 : 0);
  // Validate this.
  if (count == 0) {
    this.emit('error', 'Either "image", "video", or "object" GET parameter is required.');
    return;
  }

  var scene = new SceneInfo(params);
  this.emit('load', scene);
};

SceneLoader.prototype.parseBoolean_ = function(value) {
  if (value == 'false') {
    return false;
  }
  return !!value;
};

SceneLoader.prototype.loadScene = function(callback) {
  // If there's a url param specified, try loading from JSON.
  var image = Util.getQueryParameter('image');
  var video = Util.getQueryParameter('video');
  var object = Util.getQueryParameter('object');
  if (image || video || object) {
    // Otherwise, try loading from URL parameters.
    this.loadFromGetParams_();
  } else {
    // If it fails, throw an exception.
    this.emit('error', 'Unable to load scene. Required parameter missing.');
  }
};

module.exports = SceneLoader;
