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


/**
 * Sends DeviceMotion events to all embedded VR views via postMessage. Note:
 * each iframe must have a class 'vrview'.
 *
 * This is a workaround for https://bugs.webkit.org/show_bug.cgi?id=150072.
 */
function DeviceMotionSender() {
  // This is an iOS-specific workaround.
  if (!this.isIOS_()) {
    return;
  }

  window.addEventListener('devicemotion', this.onDeviceMotion_.bind(this), false);

  // Find the right iFrame to send data to.
  this.iframes = document.querySelectorAll('iframe.vrview');
}

DeviceMotionSender.prototype.onDeviceMotion_ = function(e) {
  var message = {
    type: 'DeviceMotion',
    deviceMotionEvent: this.cloneDeviceMotionEvent_(e)
  };
  for (var i = 0; i < this.iframes.length; i++) {
    // Only send data if we're on iOS and we are dealing with a cross-domain
    // iframe.
    var iframe = this.iframes[i];
    var iframeWindow = iframe.contentWindow;
    if (this.isCrossDomainIframe_(iframe)) {
      iframeWindow.postMessage(message, '*');
    }
  }
};

DeviceMotionSender.prototype.cloneDeviceMotionEvent_ = function(e) {
  return {
    acceleration: {
      x: e.acceleration.x,
      y: e.acceleration.y,
      z: e.acceleration.z,
    },
    accelerationIncludingGravity: {
      x: e.accelerationIncludingGravity.x,
      y: e.accelerationIncludingGravity.y,
      z: e.accelerationIncludingGravity.z,
    },
    rotationRate: {
      alpha: e.rotationRate.alpha,
      beta: e.rotationRate.beta,
      gamma: e.rotationRate.gamma,
    },
    interval: e.interval
  };
};

DeviceMotionSender.prototype.isIOS_ = function() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// From http://stackoverflow.com/questions/12381334/foolproof-way-to-detect-if-iframe-is-cross-domain.
DeviceMotionSender.prototype.isCrossDomainIframe_ = function(iframe) {
  var html = null;
  try { 
    var doc = iframe.contentDocument || iframe.contentWindow.document;
    html = doc.body.innerHTML;
  } catch (err) {
  }

  return (html === null);
};

var dms = new DeviceMotionSender();
