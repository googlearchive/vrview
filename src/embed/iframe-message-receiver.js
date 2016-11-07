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
var EventEmitter = require('eventemitter3');
var Message = require('../message');
var Util = require('../util');


/**
 * Sits in an embedded iframe, receiving messages from a containing
 * iFrame. This facilitates an API which provides the following features:
 *
 *    Playing and pausing content.
 *    Adding hotspots.
 *    Sending messages back to the containing iframe when hotspot is clicked
 *    Sending analytics events to containing iframe.
 *    Receiving DeviceMotion events and resynthesizing them in this iframe
 *        (workaround for https://bugs.webkit.org/show_bug.cgi?id=150072).
 */
function IFrameMessageReceiver() {
  window.addEventListener('message', this.onMessage_.bind(this), false);
}
IFrameMessageReceiver.prototype = new EventEmitter();

IFrameMessageReceiver.prototype.onMessage_ = function(event) {
  if (Util.isDebug()) {
    console.log('onMessage_', event);
  }

  var message = event.data;
  var type = message.type.toLowerCase();
  var data = message.data;

  switch (type) {
    case Message.DEVICE_MOTION:
      // Synthesize a DeviceMotion event.
      this.synthesizeDeviceMotionEvent_(message.deviceMotionEvent);
      break;
    case Message.SET_CONTENT:
    case Message.SET_VOLUME:
    case Message.ADD_HOTSPOT:
    case Message.PLAY:
    case Message.PAUSE:
      // TODO(smus): Emit the event 
      this.emit(type, data);
      break;
    default:
      if (Util.isDebug()) {
        console.warn('Got unknown message of type %s from %s', message.type, message.origin);
      }
  }
};

IFrameMessageReceiver.prototype.synthesizeDeviceMotionEvent_ = function(eventData) {
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

module.exports = IFrameMessageReceiver;
