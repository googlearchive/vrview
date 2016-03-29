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
 * Sits in an embedded iframe, receiving DeviceMotion messages from a containing
 * iFrame. These messages are converted into synthetic DeviceMotion events.
 *
 * This is a workaround for https://bugs.webkit.org/show_bug.cgi?id=150072.
 */
function DeviceMotionReceiver() {
  window.addEventListener('message', this.onMessage_.bind(this), false);
}

DeviceMotionReceiver.prototype.onMessage_ = function(event) {
  var message = event.data;
  if (message.type !== 'DeviceMotion') {
    console.warn('Got unknown message of type %s from %s', message.type, message.origin);
    return;
  }

  console.log('onMessage_', event);

  // Synthesize a DeviceMotion event.
  this.synthesizeDeviceMotionEvent_(message.deviceMotionEvent);
};

DeviceMotionReceiver.prototype.synthesizeDeviceMotionEvent_ = function(eventData) {
  var type = 'devicemotion-iframe';
  var canBubble = false;
  var cancelable = false;

  var dme = document.createEvent('DeviceMotionEvent');
  dme.initDeviceMotionEvent(type, canBubble, cancelable,
      eventData.acceleration,
      eventData.accelerationIncludingGravity,
      eventData.rotationRate,
      eventData.interval);

  window.dispatchEvent(dme);
};

module.exports = DeviceMotionReceiver;
