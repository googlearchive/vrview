(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.VRView = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
var Message = require('../message');

/**
 * Sends events to the embedded VR view IFrame via postMessage. Also handles
 * messages sent back from the IFrame:
 *
 *    click: When a hotspot was clicked.
 *    modechange: When the user changes viewing mode (VR|Fullscreen|etc).
 */
function IFrameMessageSender(iframe) {
  if (!iframe) {
    console.error('No iframe specified');
    return;
  }
  this.iframe = iframe;

  // On iOS, if the iframe is across domains, also send DeviceMotion data.
  if (this.isIOS_() && this.isCrossDomainIframe_()) {
    window.addEventListener('devicemotion', this.onDeviceMotion_.bind(this), false);
  }
}

/**
 * Sends a message to the associated VR View IFrame.
 */
IFrameMessageSender.prototype.send = function(message) {
  var iframeWindow = this.iframe.contentWindow;
  iframeWindow.postMessage(message, '*');
};

IFrameMessageSender.prototype.onDeviceMotion_ = function(e) {
  var message = {
    type: Message.DEVICE_MOTION,
    deviceMotionEvent: this.cloneDeviceMotionEvent_(e)
  };

  this.send(message);
};

IFrameMessageSender.prototype.cloneDeviceMotionEvent_ = function(e) {
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

IFrameMessageSender.prototype.isIOS_ = function() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// From http://stackoverflow.com/questions/12381334/foolproof-way-to-detect-if-iframe-is-cross-domain.
IFrameMessageSender.prototype.isCrossDomainIframe_ = function(iframe) {
  var html = null;
  try { 
    var doc = iframe.contentDocument || iframe.contentWindow.document;
    html = doc.body.innerHTML;
  } catch (err) {
  }

  return (html === null);
};

module.exports = IFrameMessageSender;

},{"../message":6}],2:[function(require,module,exports){
var Player = require('./player');
var Coordinate = require('../coordinate');

var VRView = {
  Player: Player,
  Coordinate: Coordinate
};

module.exports = VRView;

},{"../coordinate":4,"./player":3}],3:[function(require,module,exports){
var Emitter = require('../emitter');
var IFrameMessageSender = require('./iframe-message-sender');
var Message = require('../message');
var Util = require('../util');

var EMBED_URL = '../../index.html?';

/**
 * Entry point for the VR View JS API.
 *
 * Emits the following events:
 *    ready: When the player is loaded.
 *    modechange: When the viewing mode changes (normal, fullscreen, VR).
 *    click (id): When a hotspot is clicked.
 */
function Player(selector, params) {
  // Create a VR View iframe depending on the parameters.
  var iframe = this.createIframe_(params);

  var parentEl = document.querySelector(selector);
  parentEl.appendChild(iframe);

  // Make a sender as well, for relying commands to the child IFrame.
  this.sender = new IFrameMessageSender(iframe);

  // Listen to messages from the IFrame.
  window.addEventListener('message', this.onMessage_.bind(this), false);
}
Player.prototype = new Emitter();

Player.prototype.addHotspot = function(coordinate1, coordinate2, hotspotId) {
  var data = {
    c1: coordinate1.toObject(),
    c2: coordinate2.toObject(),
    id: hotspotId
  };
  this.sender.send({type: Message.ADD_HOTSPOT, data: data});
};

Player.prototype.play = function() {
  this.sender.send({type: Message.PLAY});
};

Player.prototype.pause = function() {
  this.sender.send({type: Message.PAUSE});
};

/**
 * Helper for creating an iframe. 
 *
 * @return {IFrameElement} The iframe.
 */
Player.prototype.createIframe_ = function(params) {
  var iframe = document.createElement('iframe');
  iframe.setAttribute('allowfullscreen', true);
  iframe.setAttribute('scrolling', 'no');
  iframe.style.border = 0;

  // Handle iframe size if width and height are specified.
  if ('width' in params) {
    iframe.setAttribute('width', params.width);
    delete params['width'];
  }
  if ('height' in params) {
    iframe.setAttribute('height', params.height);
    delete params['height'];
  }

  var url = EMBED_URL + Util.createGetParams(params);
  iframe.src = url;

  return iframe;
};

Player.prototype.onMessage_ = function(event) {
  console.log('onMessage_', event);

  var message = event.data;
  var type = message.type.toLowerCase();
  var data = message.data;

  switch (type) {
    case 'ready':
    case 'modechange':
    case 'click':
      this.emit(type, data);
      break;
    default:
      console.warn('Got unknown message of type %s from %s', message.type, message.origin);
  }
};


module.exports = Player;

},{"../emitter":5,"../message":6,"../util":7,"./iframe-message-sender":1}],4:[function(require,module,exports){
function Coordinate(lat, lon) {
  this.lat = lat;
  this.lon = lon;
};

Coordinate.fromObject = function(obj) {
  return new Coordinate(obj.lat, obj.lon);
};

Coordinate.prototype.toObject = function() {
  return {
    lat: this.lat,
    lon: this.lon
  }
};

module.exports = Coordinate;

},{}],5:[function(require,module,exports){
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


function Emitter() {
  this.initEmitter();
}

Emitter.prototype.initEmitter = function() {
  this.callbacks = {};
};

Emitter.prototype.emit = function(eventName) {
  var callbacks = this.callbacks[eventName];
  if (!callbacks) {
    console.log('No valid callback specified.');
    return;
  }
  var args = [].slice.call(arguments)
  // Eliminate the first param (the callback).
  args.shift();
  for (var i = 0; i < callbacks.length; i++) {
    callbacks[i].apply(this, args);
  }
};

Emitter.prototype.on = function(eventName, callback) {
  if (eventName in this.callbacks) {
    var cbs = this.callbacks[eventName]
    if (cbs.indexOf(callback) == -1) {
      cbs.push(callback);
    }
  } else {
    this.callbacks[eventName] = [callback];
  }
};

Emitter.prototype.removeListener = function(eventName, callback) {
  if (!(eventName in this.callbacks)) {
    return;
  }
  var cbs = this.callbacks[eventName];
  var ind = cbs.indexOf(callback);
  if (ind == -1) {
    console.warn('No matching callback found');
    return;
  }
  cbs.splice(ind, 1);
};

module.exports = Emitter;

},{}],6:[function(require,module,exports){
/**
 * Messages from the API to the embed.
 */
var Message = {
  PLAY: 'play',
  PAUSE: 'pause',
  ADD_HOTSPOT: 'addhotspot',
  DEVICE_MOTION: 'devicemotion',
};

module.exports = Message;

},{}],7:[function(require,module,exports){
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

Util = window.Util || {};

Util.isDataURI = function(src) {
  return src && src.indexOf('data:') == 0;
};

Util.generateUUID = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};

Util.isMobile = function() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

Util.isIOS = function() {
  return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
};

Util.cloneObject = function(obj) {
  var out = {};
  for (key in obj) {
    out[key] = obj[key];
  }
  return out;
};

Util.hashCode = function(s) {
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
};

Util.loadTrackSrc = function(context, src, callback, opt_progressCallback) {
  var request = new XMLHttpRequest();
  request.open('GET', src, true);
  request.responseType = 'arraybuffer';

  // Decode asynchronously.
  request.onload = function() {
    context.decodeAudioData(request.response, function(buffer) {
      callback(buffer);
    }, function(e) {
      console.error(e);
    });
  };
  if (opt_progressCallback) {
    request.onprogress = function(e) {
      var percent = e.loaded / e.total;
      opt_progressCallback(percent);
    };
  }
  request.send();
};

Util.isPow2 = function(n) {
  return (n & (n - 1)) == 0;
};

Util.capitalize = function(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

Util.isIFrame = function() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

// From http://goo.gl/4WX3tg
Util.getQueryParameter = function(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};


// From http://stackoverflow.com/questions/11871077/proper-way-to-detect-webgl-support.
Util.isWebGLEnabled = function() {
  var canvas = document.createElement('canvas');
  try { gl = canvas.getContext("webgl"); }
  catch (x) { gl = null; }

  if (gl == null) {
    try { gl = canvas.getContext("experimental-webgl"); experimental = true; }
    catch (x) { gl = null; }
  }
  return !!gl;
};

Util.clone = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

// From http://stackoverflow.com/questions/10140604/fastest-hypotenuse-in-javascript
Util.hypot = Math.hypot || function(x, y) {
  return Math.sqrt(x*x + y*y);
};

// From http://stackoverflow.com/a/17447718/693934
Util.isIE11 = function() {
  return navigator.userAgent.match(/Trident/);
};

Util.getRectCenter = function(rect) {
  return new THREE.Vector2(rect.x + rect.width/2, rect.y + rect.height/2);
};

Util.getScreenWidth = function() {
  return Math.max(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};

Util.getScreenHeight = function() {
  return Math.min(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};

Util.isIOS9OrLess = function() {
  if (!Util.isIOS()) {
    return false;
  }
  var re = /(iPhone|iPad|iPod) OS ([\d_]+)/;
  var iOSVersion = navigator.userAgent.match(re);
  if (!iOSVersion) {
    return false;
  }
  // Get the last group.
  var versionString = iOSVersion[iOSVersion.length - 1];
  var majorVersion = parseFloat(versionString);
  return majorVersion <= 9;
};

Util.getExtension = function(url) {
  return url.split('.').pop();
};

Util.createGetParams = function(params) {
  var out = '?';
  for (var k in params) {
    var paramString = k + '=' + params[k] + '&';
    out += paramString;
  }
  // Remove the trailing ampersand.
  out.substring(0, params.length - 2);
  return out;
};

Util.sendParentMessage = function(message) {
  if (window.parent) {
    parent.postMessage(message, '*');
  }
};

module.exports = Util;

},{}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL2hvbWVicmV3L2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNyYy9hcGkvaWZyYW1lLW1lc3NhZ2Utc2VuZGVyLmpzIiwic3JjL2FwaS9tYWluLmpzIiwic3JjL2FwaS9wbGF5ZXIuanMiLCJzcmMvY29vcmRpbmF0ZS5qcyIsInNyYy9lbWl0dGVyLmpzIiwic3JjL21lc3NhZ2UuanMiLCJzcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG52YXIgTWVzc2FnZSA9IHJlcXVpcmUoJy4uL21lc3NhZ2UnKTtcblxuLyoqXG4gKiBTZW5kcyBldmVudHMgdG8gdGhlIGVtYmVkZGVkIFZSIHZpZXcgSUZyYW1lIHZpYSBwb3N0TWVzc2FnZS4gQWxzbyBoYW5kbGVzXG4gKiBtZXNzYWdlcyBzZW50IGJhY2sgZnJvbSB0aGUgSUZyYW1lOlxuICpcbiAqICAgIGNsaWNrOiBXaGVuIGEgaG90c3BvdCB3YXMgY2xpY2tlZC5cbiAqICAgIG1vZGVjaGFuZ2U6IFdoZW4gdGhlIHVzZXIgY2hhbmdlcyB2aWV3aW5nIG1vZGUgKFZSfEZ1bGxzY3JlZW58ZXRjKS5cbiAqL1xuZnVuY3Rpb24gSUZyYW1lTWVzc2FnZVNlbmRlcihpZnJhbWUpIHtcbiAgaWYgKCFpZnJhbWUpIHtcbiAgICBjb25zb2xlLmVycm9yKCdObyBpZnJhbWUgc3BlY2lmaWVkJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuaWZyYW1lID0gaWZyYW1lO1xuXG4gIC8vIE9uIGlPUywgaWYgdGhlIGlmcmFtZSBpcyBhY3Jvc3MgZG9tYWlucywgYWxzbyBzZW5kIERldmljZU1vdGlvbiBkYXRhLlxuICBpZiAodGhpcy5pc0lPU18oKSAmJiB0aGlzLmlzQ3Jvc3NEb21haW5JZnJhbWVfKCkpIHtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlbW90aW9uJywgdGhpcy5vbkRldmljZU1vdGlvbl8uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB9XG59XG5cbi8qKlxuICogU2VuZHMgYSBtZXNzYWdlIHRvIHRoZSBhc3NvY2lhdGVkIFZSIFZpZXcgSUZyYW1lLlxuICovXG5JRnJhbWVNZXNzYWdlU2VuZGVyLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgaWZyYW1lV2luZG93ID0gdGhpcy5pZnJhbWUuY29udGVudFdpbmRvdztcbiAgaWZyYW1lV2luZG93LnBvc3RNZXNzYWdlKG1lc3NhZ2UsICcqJyk7XG59O1xuXG5JRnJhbWVNZXNzYWdlU2VuZGVyLnByb3RvdHlwZS5vbkRldmljZU1vdGlvbl8gPSBmdW5jdGlvbihlKSB7XG4gIHZhciBtZXNzYWdlID0ge1xuICAgIHR5cGU6IE1lc3NhZ2UuREVWSUNFX01PVElPTixcbiAgICBkZXZpY2VNb3Rpb25FdmVudDogdGhpcy5jbG9uZURldmljZU1vdGlvbkV2ZW50XyhlKVxuICB9O1xuXG4gIHRoaXMuc2VuZChtZXNzYWdlKTtcbn07XG5cbklGcmFtZU1lc3NhZ2VTZW5kZXIucHJvdG90eXBlLmNsb25lRGV2aWNlTW90aW9uRXZlbnRfID0gZnVuY3Rpb24oZSkge1xuICByZXR1cm4ge1xuICAgIGFjY2VsZXJhdGlvbjoge1xuICAgICAgeDogZS5hY2NlbGVyYXRpb24ueCxcbiAgICAgIHk6IGUuYWNjZWxlcmF0aW9uLnksXG4gICAgICB6OiBlLmFjY2VsZXJhdGlvbi56LFxuICAgIH0sXG4gICAgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eToge1xuICAgICAgeDogZS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LngsXG4gICAgICB5OiBlLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkueSxcbiAgICAgIHo6IGUuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS56LFxuICAgIH0sXG4gICAgcm90YXRpb25SYXRlOiB7XG4gICAgICBhbHBoYTogZS5yb3RhdGlvblJhdGUuYWxwaGEsXG4gICAgICBiZXRhOiBlLnJvdGF0aW9uUmF0ZS5iZXRhLFxuICAgICAgZ2FtbWE6IGUucm90YXRpb25SYXRlLmdhbW1hLFxuICAgIH0sXG4gICAgaW50ZXJ2YWw6IGUuaW50ZXJ2YWxcbiAgfTtcbn07XG5cbklGcmFtZU1lc3NhZ2VTZW5kZXIucHJvdG90eXBlLmlzSU9TXyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gL2lQYWR8aVBob25lfGlQb2QvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkgJiYgIXdpbmRvdy5NU1N0cmVhbTtcbn07XG5cbi8vIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMjM4MTMzNC9mb29scHJvb2Ytd2F5LXRvLWRldGVjdC1pZi1pZnJhbWUtaXMtY3Jvc3MtZG9tYWluLlxuSUZyYW1lTWVzc2FnZVNlbmRlci5wcm90b3R5cGUuaXNDcm9zc0RvbWFpbklmcmFtZV8gPSBmdW5jdGlvbihpZnJhbWUpIHtcbiAgdmFyIGh0bWwgPSBudWxsO1xuICB0cnkgeyBcbiAgICB2YXIgZG9jID0gaWZyYW1lLmNvbnRlbnREb2N1bWVudCB8fCBpZnJhbWUuY29udGVudFdpbmRvdy5kb2N1bWVudDtcbiAgICBodG1sID0gZG9jLmJvZHkuaW5uZXJIVE1MO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgfVxuXG4gIHJldHVybiAoaHRtbCA9PT0gbnVsbCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IElGcmFtZU1lc3NhZ2VTZW5kZXI7XG4iLCJ2YXIgUGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbnZhciBDb29yZGluYXRlID0gcmVxdWlyZSgnLi4vY29vcmRpbmF0ZScpO1xuXG52YXIgVlJWaWV3ID0ge1xuICBQbGF5ZXI6IFBsYXllcixcbiAgQ29vcmRpbmF0ZTogQ29vcmRpbmF0ZVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWUlZpZXc7XG4iLCJ2YXIgRW1pdHRlciA9IHJlcXVpcmUoJy4uL2VtaXR0ZXInKTtcbnZhciBJRnJhbWVNZXNzYWdlU2VuZGVyID0gcmVxdWlyZSgnLi9pZnJhbWUtbWVzc2FnZS1zZW5kZXInKTtcbnZhciBNZXNzYWdlID0gcmVxdWlyZSgnLi4vbWVzc2FnZScpO1xudmFyIFV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbnZhciBFTUJFRF9VUkwgPSAnLi4vLi4vaW5kZXguaHRtbD8nO1xuXG4vKipcbiAqIEVudHJ5IHBvaW50IGZvciB0aGUgVlIgVmlldyBKUyBBUEkuXG4gKlxuICogRW1pdHMgdGhlIGZvbGxvd2luZyBldmVudHM6XG4gKiAgICByZWFkeTogV2hlbiB0aGUgcGxheWVyIGlzIGxvYWRlZC5cbiAqICAgIG1vZGVjaGFuZ2U6IFdoZW4gdGhlIHZpZXdpbmcgbW9kZSBjaGFuZ2VzIChub3JtYWwsIGZ1bGxzY3JlZW4sIFZSKS5cbiAqICAgIGNsaWNrIChpZCk6IFdoZW4gYSBob3RzcG90IGlzIGNsaWNrZWQuXG4gKi9cbmZ1bmN0aW9uIFBsYXllcihzZWxlY3RvciwgcGFyYW1zKSB7XG4gIC8vIENyZWF0ZSBhIFZSIFZpZXcgaWZyYW1lIGRlcGVuZGluZyBvbiB0aGUgcGFyYW1ldGVycy5cbiAgdmFyIGlmcmFtZSA9IHRoaXMuY3JlYXRlSWZyYW1lXyhwYXJhbXMpO1xuXG4gIHZhciBwYXJlbnRFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICBwYXJlbnRFbC5hcHBlbmRDaGlsZChpZnJhbWUpO1xuXG4gIC8vIE1ha2UgYSBzZW5kZXIgYXMgd2VsbCwgZm9yIHJlbHlpbmcgY29tbWFuZHMgdG8gdGhlIGNoaWxkIElGcmFtZS5cbiAgdGhpcy5zZW5kZXIgPSBuZXcgSUZyYW1lTWVzc2FnZVNlbmRlcihpZnJhbWUpO1xuXG4gIC8vIExpc3RlbiB0byBtZXNzYWdlcyBmcm9tIHRoZSBJRnJhbWUuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgdGhpcy5vbk1lc3NhZ2VfLmJpbmQodGhpcyksIGZhbHNlKTtcbn1cblBsYXllci5wcm90b3R5cGUgPSBuZXcgRW1pdHRlcigpO1xuXG5QbGF5ZXIucHJvdG90eXBlLmFkZEhvdHNwb3QgPSBmdW5jdGlvbihjb29yZGluYXRlMSwgY29vcmRpbmF0ZTIsIGhvdHNwb3RJZCkge1xuICB2YXIgZGF0YSA9IHtcbiAgICBjMTogY29vcmRpbmF0ZTEudG9PYmplY3QoKSxcbiAgICBjMjogY29vcmRpbmF0ZTIudG9PYmplY3QoKSxcbiAgICBpZDogaG90c3BvdElkXG4gIH07XG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuQUREX0hPVFNQT1QsIGRhdGE6IGRhdGF9KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLlBMQVl9KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5QQVVTRX0pO1xufTtcblxuLyoqXG4gKiBIZWxwZXIgZm9yIGNyZWF0aW5nIGFuIGlmcmFtZS4gXG4gKlxuICogQHJldHVybiB7SUZyYW1lRWxlbWVudH0gVGhlIGlmcmFtZS5cbiAqL1xuUGxheWVyLnByb3RvdHlwZS5jcmVhdGVJZnJhbWVfID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gIHZhciBpZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnYWxsb3dmdWxsc2NyZWVuJywgdHJ1ZSk7XG4gIGlmcmFtZS5zZXRBdHRyaWJ1dGUoJ3Njcm9sbGluZycsICdubycpO1xuICBpZnJhbWUuc3R5bGUuYm9yZGVyID0gMDtcblxuICAvLyBIYW5kbGUgaWZyYW1lIHNpemUgaWYgd2lkdGggYW5kIGhlaWdodCBhcmUgc3BlY2lmaWVkLlxuICBpZiAoJ3dpZHRoJyBpbiBwYXJhbXMpIHtcbiAgICBpZnJhbWUuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHBhcmFtcy53aWR0aCk7XG4gICAgZGVsZXRlIHBhcmFtc1snd2lkdGgnXTtcbiAgfVxuICBpZiAoJ2hlaWdodCcgaW4gcGFyYW1zKSB7XG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgcGFyYW1zLmhlaWdodCk7XG4gICAgZGVsZXRlIHBhcmFtc1snaGVpZ2h0J107XG4gIH1cblxuICB2YXIgdXJsID0gRU1CRURfVVJMICsgVXRpbC5jcmVhdGVHZXRQYXJhbXMocGFyYW1zKTtcbiAgaWZyYW1lLnNyYyA9IHVybDtcblxuICByZXR1cm4gaWZyYW1lO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5vbk1lc3NhZ2VfID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgY29uc29sZS5sb2coJ29uTWVzc2FnZV8nLCBldmVudCk7XG5cbiAgdmFyIG1lc3NhZ2UgPSBldmVudC5kYXRhO1xuICB2YXIgdHlwZSA9IG1lc3NhZ2UudHlwZS50b0xvd2VyQ2FzZSgpO1xuICB2YXIgZGF0YSA9IG1lc3NhZ2UuZGF0YTtcblxuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlICdyZWFkeSc6XG4gICAgY2FzZSAnbW9kZWNoYW5nZSc6XG4gICAgY2FzZSAnY2xpY2snOlxuICAgICAgdGhpcy5lbWl0KHR5cGUsIGRhdGEpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGNvbnNvbGUud2FybignR290IHVua25vd24gbWVzc2FnZSBvZiB0eXBlICVzIGZyb20gJXMnLCBtZXNzYWdlLnR5cGUsIG1lc3NhZ2Uub3JpZ2luKTtcbiAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllcjtcbiIsImZ1bmN0aW9uIENvb3JkaW5hdGUobGF0LCBsb24pIHtcbiAgdGhpcy5sYXQgPSBsYXQ7XG4gIHRoaXMubG9uID0gbG9uO1xufTtcblxuQ29vcmRpbmF0ZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBuZXcgQ29vcmRpbmF0ZShvYmoubGF0LCBvYmoubG9uKTtcbn07XG5cbkNvb3JkaW5hdGUucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgbGF0OiB0aGlzLmxhdCxcbiAgICBsb246IHRoaXMubG9uXG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29vcmRpbmF0ZTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cblxuZnVuY3Rpb24gRW1pdHRlcigpIHtcbiAgdGhpcy5pbml0RW1pdHRlcigpO1xufVxuXG5FbWl0dGVyLnByb3RvdHlwZS5pbml0RW1pdHRlciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNhbGxiYWNrcyA9IHt9O1xufTtcblxuRW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50TmFtZSkge1xuICB2YXIgY2FsbGJhY2tzID0gdGhpcy5jYWxsYmFja3NbZXZlbnROYW1lXTtcbiAgaWYgKCFjYWxsYmFja3MpIHtcbiAgICBjb25zb2xlLmxvZygnTm8gdmFsaWQgY2FsbGJhY2sgc3BlY2lmaWVkLicpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAvLyBFbGltaW5hdGUgdGhlIGZpcnN0IHBhcmFtICh0aGUgY2FsbGJhY2spLlxuICBhcmdzLnNoaWZ0KCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG59O1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50TmFtZSwgY2FsbGJhY2spIHtcbiAgaWYgKGV2ZW50TmFtZSBpbiB0aGlzLmNhbGxiYWNrcykge1xuICAgIHZhciBjYnMgPSB0aGlzLmNhbGxiYWNrc1tldmVudE5hbWVdXG4gICAgaWYgKGNicy5pbmRleE9mKGNhbGxiYWNrKSA9PSAtMSkge1xuICAgICAgY2JzLnB1c2goY2FsbGJhY2spO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLmNhbGxiYWNrc1tldmVudE5hbWVdID0gW2NhbGxiYWNrXTtcbiAgfVxufTtcblxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbihldmVudE5hbWUsIGNhbGxiYWNrKSB7XG4gIGlmICghKGV2ZW50TmFtZSBpbiB0aGlzLmNhbGxiYWNrcykpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGNicyA9IHRoaXMuY2FsbGJhY2tzW2V2ZW50TmFtZV07XG4gIHZhciBpbmQgPSBjYnMuaW5kZXhPZihjYWxsYmFjayk7XG4gIGlmIChpbmQgPT0gLTEpIHtcbiAgICBjb25zb2xlLndhcm4oJ05vIG1hdGNoaW5nIGNhbGxiYWNrIGZvdW5kJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNicy5zcGxpY2UoaW5kLCAxKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcbiIsIi8qKlxuICogTWVzc2FnZXMgZnJvbSB0aGUgQVBJIHRvIHRoZSBlbWJlZC5cbiAqL1xudmFyIE1lc3NhZ2UgPSB7XG4gIFBMQVk6ICdwbGF5JyxcbiAgUEFVU0U6ICdwYXVzZScsXG4gIEFERF9IT1RTUE9UOiAnYWRkaG90c3BvdCcsXG4gIERFVklDRV9NT1RJT046ICdkZXZpY2Vtb3Rpb24nLFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuVXRpbCA9IHdpbmRvdy5VdGlsIHx8IHt9O1xuXG5VdGlsLmlzRGF0YVVSSSA9IGZ1bmN0aW9uKHNyYykge1xuICByZXR1cm4gc3JjICYmIHNyYy5pbmRleE9mKCdkYXRhOicpID09IDA7XG59O1xuXG5VdGlsLmdlbmVyYXRlVVVJRCA9IGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiBzNCgpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcbiAgICAudG9TdHJpbmcoMTYpXG4gICAgLnN1YnN0cmluZygxKTtcbiAgfVxuICByZXR1cm4gczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArXG4gICAgczQoKSArICctJyArIHM0KCkgKyBzNCgpICsgczQoKTtcbn07XG5cblV0aWwuaXNNb2JpbGUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNoZWNrID0gZmFsc2U7XG4gIChmdW5jdGlvbihhKXtpZigvKGFuZHJvaWR8YmJcXGQrfG1lZWdvKS4rbW9iaWxlfGF2YW50Z298YmFkYVxcL3xibGFja2JlcnJ5fGJsYXplcnxjb21wYWx8ZWxhaW5lfGZlbm5lY3xoaXB0b3B8aWVtb2JpbGV8aXAoaG9uZXxvZCl8aXJpc3xraW5kbGV8bGdlIHxtYWVtb3xtaWRwfG1tcHxtb2JpbGUuK2ZpcmVmb3h8bmV0ZnJvbnR8b3BlcmEgbShvYnxpbilpfHBhbG0oIG9zKT98cGhvbmV8cChpeGl8cmUpXFwvfHBsdWNrZXJ8cG9ja2V0fHBzcHxzZXJpZXMoNHw2KTB8c3ltYmlhbnx0cmVvfHVwXFwuKGJyb3dzZXJ8bGluayl8dm9kYWZvbmV8d2FwfHdpbmRvd3MgY2V8eGRhfHhpaW5vL2kudGVzdChhKXx8LzEyMDd8NjMxMHw2NTkwfDNnc298NHRocHw1MFsxLTZdaXw3NzBzfDgwMnN8YSB3YXxhYmFjfGFjKGVyfG9vfHNcXC0pfGFpKGtvfHJuKXxhbChhdnxjYXxjbyl8YW1vaXxhbihleHxueXx5dyl8YXB0dXxhcihjaHxnbyl8YXModGV8dXMpfGF0dHd8YXUoZGl8XFwtbXxyIHxzICl8YXZhbnxiZShja3xsbHxucSl8YmkobGJ8cmQpfGJsKGFjfGF6KXxicihlfHYpd3xidW1ifGJ3XFwtKG58dSl8YzU1XFwvfGNhcGl8Y2N3YXxjZG1cXC18Y2VsbHxjaHRtfGNsZGN8Y21kXFwtfGNvKG1wfG5kKXxjcmF3fGRhKGl0fGxsfG5nKXxkYnRlfGRjXFwtc3xkZXZpfGRpY2F8ZG1vYnxkbyhjfHApb3xkcygxMnxcXC1kKXxlbCg0OXxhaSl8ZW0obDJ8dWwpfGVyKGljfGswKXxlc2w4fGV6KFs0LTddMHxvc3x3YXx6ZSl8ZmV0Y3xmbHkoXFwtfF8pfGcxIHV8ZzU2MHxnZW5lfGdmXFwtNXxnXFwtbW98Z28oXFwud3xvZCl8Z3IoYWR8dW4pfGhhaWV8aGNpdHxoZFxcLShtfHB8dCl8aGVpXFwtfGhpKHB0fHRhKXxocCggaXxpcCl8aHNcXC1jfGh0KGMoXFwtfCB8X3xhfGd8cHxzfHQpfHRwKXxodShhd3x0Yyl8aVxcLSgyMHxnb3xtYSl8aTIzMHxpYWMoIHxcXC18XFwvKXxpYnJvfGlkZWF8aWcwMXxpa29tfGltMWt8aW5ub3xpcGFxfGlyaXN8amEodHx2KWF8amJyb3xqZW11fGppZ3N8a2RkaXxrZWppfGtndCggfFxcLyl8a2xvbnxrcHQgfGt3Y1xcLXxreW8oY3xrKXxsZShub3x4aSl8bGcoIGd8XFwvKGt8bHx1KXw1MHw1NHxcXC1bYS13XSl8bGlid3xseW54fG0xXFwtd3xtM2dhfG01MFxcL3xtYSh0ZXx1aXx4byl8bWMoMDF8MjF8Y2EpfG1cXC1jcnxtZShyY3xyaSl8bWkobzh8b2F8dHMpfG1tZWZ8bW8oMDF8MDJ8Yml8ZGV8ZG98dChcXC18IHxvfHYpfHp6KXxtdCg1MHxwMXx2ICl8bXdicHxteXdhfG4xMFswLTJdfG4yMFsyLTNdfG4zMCgwfDIpfG41MCgwfDJ8NSl8bjcoMCgwfDEpfDEwKXxuZSgoY3xtKVxcLXxvbnx0Znx3Znx3Z3x3dCl8bm9rKDZ8aSl8bnpwaHxvMmltfG9wKHRpfHd2KXxvcmFufG93ZzF8cDgwMHxwYW4oYXxkfHQpfHBkeGd8cGcoMTN8XFwtKFsxLThdfGMpKXxwaGlsfHBpcmV8cGwoYXl8dWMpfHBuXFwtMnxwbyhja3xydHxzZSl8cHJveHxwc2lvfHB0XFwtZ3xxYVxcLWF8cWMoMDd8MTJ8MjF8MzJ8NjB8XFwtWzItN118aVxcLSl8cXRla3xyMzgwfHI2MDB8cmFrc3xyaW05fHJvKHZlfHpvKXxzNTVcXC98c2EoZ2V8bWF8bW18bXN8bnl8dmEpfHNjKDAxfGhcXC18b298cFxcLSl8c2RrXFwvfHNlKGMoXFwtfDB8MSl8NDd8bWN8bmR8cmkpfHNnaFxcLXxzaGFyfHNpZShcXC18bSl8c2tcXC0wfHNsKDQ1fGlkKXxzbShhbHxhcnxiM3xpdHx0NSl8c28oZnR8bnkpfHNwKDAxfGhcXC18dlxcLXx2ICl8c3koMDF8bWIpfHQyKDE4fDUwKXx0NigwMHwxMHwxOCl8dGEoZ3R8bGspfHRjbFxcLXx0ZGdcXC18dGVsKGl8bSl8dGltXFwtfHRcXC1tb3x0byhwbHxzaCl8dHMoNzB8bVxcLXxtM3xtNSl8dHhcXC05fHVwKFxcLmJ8ZzF8c2kpfHV0c3R8djQwMHx2NzUwfHZlcml8dmkocmd8dGUpfHZrKDQwfDVbMC0zXXxcXC12KXx2bTQwfHZvZGF8dnVsY3x2eCg1Mnw1M3w2MHw2MXw3MHw4MHw4MXw4M3w4NXw5OCl8dzNjKFxcLXwgKXx3ZWJjfHdoaXR8d2koZyB8bmN8bncpfHdtbGJ8d29udXx4NzAwfHlhc1xcLXx5b3VyfHpldG98enRlXFwtL2kudGVzdChhLnN1YnN0cigwLDQpKSljaGVjayA9IHRydWV9KShuYXZpZ2F0b3IudXNlckFnZW50fHxuYXZpZ2F0b3IudmVuZG9yfHx3aW5kb3cub3BlcmEpO1xuICByZXR1cm4gY2hlY2s7XG59O1xuXG5VdGlsLmlzSU9TID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAvKGlQYWR8aVBob25lfGlQb2QpL2cudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcbn07XG5cblV0aWwuY2xvbmVPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIG91dCA9IHt9O1xuICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICBvdXRba2V5XSA9IG9ialtrZXldO1xuICB9XG4gIHJldHVybiBvdXQ7XG59O1xuXG5VdGlsLmhhc2hDb2RlID0gZnVuY3Rpb24ocykge1xuICByZXR1cm4gcy5zcGxpdChcIlwiKS5yZWR1Y2UoZnVuY3Rpb24oYSxiKXthPSgoYTw8NSktYSkrYi5jaGFyQ29kZUF0KDApO3JldHVybiBhJmF9LDApO1xufTtcblxuVXRpbC5sb2FkVHJhY2tTcmMgPSBmdW5jdGlvbihjb250ZXh0LCBzcmMsIGNhbGxiYWNrLCBvcHRfcHJvZ3Jlc3NDYWxsYmFjaykge1xuICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICByZXF1ZXN0Lm9wZW4oJ0dFVCcsIHNyYywgdHJ1ZSk7XG4gIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcblxuICAvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHkuXG4gIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgY29udGV4dC5kZWNvZGVBdWRpb0RhdGEocmVxdWVzdC5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICBjYWxsYmFjayhidWZmZXIpO1xuICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgfSk7XG4gIH07XG4gIGlmIChvcHRfcHJvZ3Jlc3NDYWxsYmFjaykge1xuICAgIHJlcXVlc3Qub25wcm9ncmVzcyA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciBwZXJjZW50ID0gZS5sb2FkZWQgLyBlLnRvdGFsO1xuICAgICAgb3B0X3Byb2dyZXNzQ2FsbGJhY2socGVyY2VudCk7XG4gICAgfTtcbiAgfVxuICByZXF1ZXN0LnNlbmQoKTtcbn07XG5cblV0aWwuaXNQb3cyID0gZnVuY3Rpb24obikge1xuICByZXR1cm4gKG4gJiAobiAtIDEpKSA9PSAwO1xufTtcblxuVXRpbC5jYXBpdGFsaXplID0gZnVuY3Rpb24ocykge1xuICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSk7XG59O1xuXG5VdGlsLmlzSUZyYW1lID0gZnVuY3Rpb24oKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHdpbmRvdy5zZWxmICE9PSB3aW5kb3cudG9wO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn07XG5cbi8vIEZyb20gaHR0cDovL2dvby5nbC80V1gzdGdcblV0aWwuZ2V0UXVlcnlQYXJhbWV0ZXIgPSBmdW5jdGlvbihuYW1lKSB7XG4gIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIik7XG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpLFxuICAgICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWMobG9jYXRpb24uc2VhcmNoKTtcbiAgcmV0dXJuIHJlc3VsdHMgPT09IG51bGwgPyBcIlwiIDogZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG59O1xuXG5cbi8vIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMTg3MTA3Ny9wcm9wZXItd2F5LXRvLWRldGVjdC13ZWJnbC1zdXBwb3J0LlxuVXRpbC5pc1dlYkdMRW5hYmxlZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gIHRyeSB7IGdsID0gY2FudmFzLmdldENvbnRleHQoXCJ3ZWJnbFwiKTsgfVxuICBjYXRjaCAoeCkgeyBnbCA9IG51bGw7IH1cblxuICBpZiAoZ2wgPT0gbnVsbCkge1xuICAgIHRyeSB7IGdsID0gY2FudmFzLmdldENvbnRleHQoXCJleHBlcmltZW50YWwtd2ViZ2xcIik7IGV4cGVyaW1lbnRhbCA9IHRydWU7IH1cbiAgICBjYXRjaCAoeCkgeyBnbCA9IG51bGw7IH1cbiAgfVxuICByZXR1cm4gISFnbDtcbn07XG5cblV0aWwuY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob2JqKSk7XG59O1xuXG4vLyBGcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTAxNDA2MDQvZmFzdGVzdC1oeXBvdGVudXNlLWluLWphdmFzY3JpcHRcblV0aWwuaHlwb3QgPSBNYXRoLmh5cG90IHx8IGZ1bmN0aW9uKHgsIHkpIHtcbiAgcmV0dXJuIE1hdGguc3FydCh4KnggKyB5KnkpO1xufTtcblxuLy8gRnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNzQ0NzcxOC82OTM5MzRcblV0aWwuaXNJRTExID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9UcmlkZW50Lyk7XG59O1xuXG5VdGlsLmdldFJlY3RDZW50ZXIgPSBmdW5jdGlvbihyZWN0KSB7XG4gIHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMihyZWN0LnggKyByZWN0LndpZHRoLzIsIHJlY3QueSArIHJlY3QuaGVpZ2h0LzIpO1xufTtcblxuVXRpbC5nZXRTY3JlZW5XaWR0aCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gTWF0aC5tYXgod2luZG93LnNjcmVlbi53aWR0aCwgd2luZG93LnNjcmVlbi5oZWlnaHQpICpcbiAgICAgIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xufTtcblxuVXRpbC5nZXRTY3JlZW5IZWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE1hdGgubWluKHdpbmRvdy5zY3JlZW4ud2lkdGgsIHdpbmRvdy5zY3JlZW4uaGVpZ2h0KSAqXG4gICAgICB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbn07XG5cblV0aWwuaXNJT1M5T3JMZXNzID0gZnVuY3Rpb24oKSB7XG4gIGlmICghVXRpbC5pc0lPUygpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciByZSA9IC8oaVBob25lfGlQYWR8aVBvZCkgT1MgKFtcXGRfXSspLztcbiAgdmFyIGlPU1ZlcnNpb24gPSBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKHJlKTtcbiAgaWYgKCFpT1NWZXJzaW9uKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIEdldCB0aGUgbGFzdCBncm91cC5cbiAgdmFyIHZlcnNpb25TdHJpbmcgPSBpT1NWZXJzaW9uW2lPU1ZlcnNpb24ubGVuZ3RoIC0gMV07XG4gIHZhciBtYWpvclZlcnNpb24gPSBwYXJzZUZsb2F0KHZlcnNpb25TdHJpbmcpO1xuICByZXR1cm4gbWFqb3JWZXJzaW9uIDw9IDk7XG59O1xuXG5VdGlsLmdldEV4dGVuc2lvbiA9IGZ1bmN0aW9uKHVybCkge1xuICByZXR1cm4gdXJsLnNwbGl0KCcuJykucG9wKCk7XG59O1xuXG5VdGlsLmNyZWF0ZUdldFBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICB2YXIgb3V0ID0gJz8nO1xuICBmb3IgKHZhciBrIGluIHBhcmFtcykge1xuICAgIHZhciBwYXJhbVN0cmluZyA9IGsgKyAnPScgKyBwYXJhbXNba10gKyAnJic7XG4gICAgb3V0ICs9IHBhcmFtU3RyaW5nO1xuICB9XG4gIC8vIFJlbW92ZSB0aGUgdHJhaWxpbmcgYW1wZXJzYW5kLlxuICBvdXQuc3Vic3RyaW5nKDAsIHBhcmFtcy5sZW5ndGggLSAyKTtcbiAgcmV0dXJuIG91dDtcbn07XG5cblV0aWwuc2VuZFBhcmVudE1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIGlmICh3aW5kb3cucGFyZW50KSB7XG4gICAgcGFyZW50LnBvc3RNZXNzYWdlKG1lc3NhZ2UsICcqJyk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDtcbiJdfQ==
