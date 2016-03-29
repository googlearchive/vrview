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

/**
 * Contains all information about a given scene, including the photosphere asset,
 * background music.
 */
function SceneInfo(opt_params) {
  var params = opt_params || {};
  this.id = params.id;
  this.title = params.title;
  this.image = params.image;
  this.preview = params.preview;
  this.isStereo = !!params.isStereo;
  this.audio = params.audio;
  this.video = params.video;
  this.yaw = params.yaw || 0;
  this.isYawOnly = params.isYawOnly;
}

SceneInfo.prototype.isComplete = function() {
  return !!this.image || !!this.video;
};

SceneInfo.prototype.toObject = function() {
  return {
    id: this.id || null,
    title: this.title || null,
    image: this.image,
    preview: this.preview,
    isStereo: this.isStereo,
    audio: this.audio,
    yaw: this.yaw || null,
    video: this.video || null,
  };
};

SceneInfo.prototype.isImageDataURI = function() {
  return this.image.indexOf('data:') == 0;
};


module.exports = SceneInfo;
