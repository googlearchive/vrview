(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.VRView = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty;

//
// We store our EE objects in a plain object whose properties are event names.
// If `Object.create(null)` is not supported we prefix the event names with a
// `~` to make sure that the built-in object properties are not overridden or
// used as an attack vector.
// We also assume that `Object.create(null)` is available when the event name
// is an ES6 Symbol.
//
var prefix = typeof Object.create !== 'function' ? '~' : false;

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} [once=false] Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Hold the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var events = this._events
    , names = []
    , name;

  if (!events) return names;

  for (name in events) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @param {Boolean} exists We only need to know if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events && this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Mixed} context Only remove listeners matching this context.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return this;

  var listeners = this._events[evt]
    , events = [];

  if (fn) {
    if (listeners.fn) {
      if (
           listeners.fn !== fn
        || (once && !listeners.once)
        || (context && listeners.context !== context)
      ) {
        events.push(listeners);
      }
    } else {
      for (var i = 0, length = listeners.length; i < length; i++) {
        if (
             listeners[i].fn !== fn
          || (once && !listeners[i].once)
          || (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[evt] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[prefix ? prefix + event : event];
  else this._events = prefix ? {} : Object.create(null);

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],2:[function(require,module,exports){
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
  if (this.isIOS_()) {
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
    interval: e.interval,
    timeStamp: e.timeStamp
  };
};

IFrameMessageSender.prototype.isIOS_ = function() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

module.exports = IFrameMessageSender;

},{"../message":5}],3:[function(require,module,exports){
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

var Player = require('./player');

var VRView = {
  Player: Player
};

module.exports = VRView;

},{"./player":4}],4:[function(require,module,exports){
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
var IFrameMessageSender = require('./iframe-message-sender');
var Message = require('../message');
var Util = require('../util');

// Save the executing script. This will be used to calculate the embed URL.
var CURRENT_SCRIPT_SRC = Util.getCurrentScript().src;
var FAKE_FULLSCREEN_CLASS = 'vrview-fake-fullscreen';

/**
 * Entry point for the VR View JS API.
 *
 * Emits the following events:
 *    ready: When the player is loaded.
 *    modechange: When the viewing mode changes (normal, fullscreen, VR).
 *    click (id): When a hotspot is clicked.
 */
function Player(selector, contentInfo) {
  // Create a VR View iframe depending on the parameters.
  var iframe = this.createIframe_(contentInfo);
  this.iframe = iframe;

  var parentEl = document.querySelector(selector);
  parentEl.appendChild(iframe);

  // Make a sender as well, for relying commands to the child IFrame.
  this.sender = new IFrameMessageSender(iframe);

  // Listen to messages from the IFrame.
  window.addEventListener('message', this.onMessage_.bind(this), false);

  // Expose a public .isPaused attribute.
  this.isPaused = false;

  if (Util.isIOS()) {
    this.injectFullscreenStylesheet_();
  }
}
Player.prototype = new EventEmitter();

/**
 * @param pitch {Number} The latitude of center, specified in degrees, between
 * -90 and 90, with 0 at the horizon.
 * @param yaw {Number} The longitude of center, specified in degrees, between
 * -180 and 180, with 0 at the image center.
 * @param radius {Number} The radius of the hotspot, specified in meters.
 * @param distance {Number} The distance of the hotspot from camera, specified
 * in meters.
 * @param hotspotId {String} The ID of the hotspot.
 */
Player.prototype.addHotspot = function(hotspotId, params) {
  // TODO: Add validation to params.
  var data = {
    pitch: params.pitch,
    yaw: params.yaw,
    radius: params.radius,
    distance: params.distance,
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

Player.prototype.setContent = function(contentInfo) {
  this.absolutifyPaths_(contentInfo);
  var data = {
    contentInfo: contentInfo
  };
  this.sender.send({type: Message.SET_CONTENT, data: data});
};

/**
 * Sets the software volume of the video. 0 is mute, 1 is max.
 */
Player.prototype.setVolume = function(volumeLevel) {
  var data = {
    volumeLevel: volumeLevel
  };
  this.sender.send({type: Message.SET_VOLUME, data: data});
};

/**
 * Helper for creating an iframe.
 *
 * @return {IFrameElement} The iframe.
 */
Player.prototype.createIframe_ = function(contentInfo) {
  this.absolutifyPaths_(contentInfo);

  var iframe = document.createElement('iframe');
  iframe.setAttribute('allowfullscreen', true);
  iframe.setAttribute('scrolling', 'no');
  iframe.style.border = 0;

  // Handle iframe size if width and height are specified.
  if (contentInfo.hasOwnProperty('width')) {
    iframe.setAttribute('width', contentInfo.width);
    delete contentInfo.width;
  }
  if (contentInfo.hasOwnProperty('height')) {
    iframe.setAttribute('height', contentInfo.height);
    delete contentInfo.height;
  }

  var url = this.getEmbedUrl_() + Util.createGetParams(contentInfo);
  iframe.src = url;

  return iframe;
};

Player.prototype.onMessage_ = function(event) {
  var message = event.data;
  if (!message || !message.type) {
    console.warn('Received message with no type.');
    return;
  }
  var type = message.type.toLowerCase();
  var data = message.data;

  switch (type) {
    case 'ready':
    case 'modechange':
    case 'error':
    case 'click':
    case 'getposition':
      this.emit(type, data);
      break;
    case 'paused':
      this.isPaused = data;
      break;
    case 'enter-fullscreen':
    case 'enter-vr':
      this.setFakeFullscreen_(true);
      break;
    case 'exit-fullscreen':
      this.setFakeFullscreen_(false);
      break;
    default:
      console.warn('Got unknown message of type %s from %s', message.type, message.origin);
  }
};

/**
 * Note: iOS doesn't support the fullscreen API.
 * In standalone <iframe> mode, VR View emulates fullscreen by redirecting to
 * another page.
 * In JS API mode, we stretch the iframe to cover the extent of the page using
 * CSS. To do this cleanly, we also inject a stylesheet.
 */
Player.prototype.setFakeFullscreen_ = function(isFullscreen) {
  if (isFullscreen) {
    this.iframe.classList.add(FAKE_FULLSCREEN_CLASS);
  } else {
    this.iframe.classList.remove(FAKE_FULLSCREEN_CLASS);
  }
};

Player.prototype.injectFullscreenStylesheet_ = function() {
  var styleString = [
    'iframe.' + FAKE_FULLSCREEN_CLASS,
    '{',
      'position: fixed !important;',
      'display: block !important;',
      'z-index: 9999999999 !important;',
      'top: 0 !important;',
      'left: 0 !important;',
      'width: 100% !important;',
      'height: 100% !important;',
      'margin: 0 !important;',
    '}',
  ].join('\n');
  var style = document.createElement('style');
  style.innerHTML = styleString;
  document.body.appendChild(style);
};

Player.prototype.getEmbedUrl_ = function() {
  // Assume that the script is in $ROOT/build/something.js, and that the iframe
  // HTML is in $ROOT/index.html.
  //
  // E.g: /vrview/2.0/build/vrview.min.js => /vrview/2.0/index.html.
  var path = CURRENT_SCRIPT_SRC;
  var split = path.split('/');
  var rootSplit = split.slice(0, split.length - 2);
  var rootPath = rootSplit.join('/');
  return rootPath + '/index.html';
};

Player.prototype.getDirName_ = function() {
  var path = window.location.pathname;
  path = path.substring(0, path.lastIndexOf('/'));
  return location.protocol + '//' + location.host + path;
};

/**
 * Make all of the URLs inside contentInfo absolute instead of relative.
 */
Player.prototype.absolutifyPaths_ = function(contentInfo) {
  var dirName = this.getDirName_();
  var urlParams = ['image', 'preview', 'video'];

  for (var i = 0; i < urlParams.length; i++) {
    var name = urlParams[i];
    var path = contentInfo[name];
    if (path && Util.isPathAbsolute(path)) {
      var absolute = Util.relativeToAbsolutePath(dirName, path);
      contentInfo[name] = absolute;
      //console.log('Converted to absolute: %s', absolute);
    }
  }
};
/**
 * Get position YAW, PITCH
 */
Player.prototype.getPosition = function() {
    this.sender.send({type: Message.GET_POSITION, data: {}});
};

module.exports = Player;

},{"../message":5,"../util":6,"./iframe-message-sender":2,"eventemitter3":1}],5:[function(require,module,exports){
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
 * Messages from the API to the embed.
 */
var Message = {
  PLAY: 'play',
  PAUSE: 'pause',
  ADD_HOTSPOT: 'addhotspot',
  SET_CONTENT: 'setimage',
  SET_VOLUME: 'setvolume',
  DEVICE_MOTION: 'devicemotion',
  GET_POSITION: 'getposition',
};

module.exports = Message;

},{}],6:[function(require,module,exports){
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

Util.isSafari = function() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
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

Util.parseBoolean = function(value) {
  if (value == 'false' || value == 0) {
    return false;
  } else if (value == 'true' || value == 1) {
    return true;
  } else {
    return !!value;
  }
};

/**
 * @param base {String} An absolute directory root.
 * @param relative {String} A relative path.
 *
 * @returns {String} An absolute path corresponding to the rootPath.
 *
 * From http://stackoverflow.com/a/14780463/693934.
 */
Util.relativeToAbsolutePath = function(base, relative) {
  var stack = base.split('/');
  var parts = relative.split('/');
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] == '.') {
      continue;
    }
    if (parts[i] == '..') {
      stack.pop();
    } else {
      stack.push(parts[i]);
    }
  }
  return stack.join('/');
};

/**
 * @return {Boolean} True iff the specified path is an absolute path.
 */
Util.isPathAbsolute = function(path) {
  return ! /^(?:\/|[a-z]+:\/\/)/.test(path);
}

Util.isEmptyObject = function(obj) {
  return Object.getOwnPropertyNames(obj).length == 0;
};

Util.isDebug = function() {
  return Util.parseBoolean(Util.getQueryParameter('debug'));
};

Util.getCurrentScript = function() {
  // Note: in IE11, document.currentScript doesn't work, so we fall back to this
  // hack, taken from https://goo.gl/TpExuH.
  if (!document.currentScript) {
    console.warn('This browser does not support document.currentScript. Trying fallback.');
  }
  return document.currentScript || document.scripts[document.scripts.length - 1];
}


module.exports = Util;

},{}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMy9pbmRleC5qcyIsInNyYy9hcGkvaWZyYW1lLW1lc3NhZ2Utc2VuZGVyLmpzIiwic3JjL2FwaS9tYWluLmpzIiwic3JjL2FwaS9wbGF5ZXIuanMiLCJzcmMvbWVzc2FnZS5qcyIsInNyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy9cbi8vIFdlIHN0b3JlIG91ciBFRSBvYmplY3RzIGluIGEgcGxhaW4gb2JqZWN0IHdob3NlIHByb3BlcnRpZXMgYXJlIGV2ZW50IG5hbWVzLlxuLy8gSWYgYE9iamVjdC5jcmVhdGUobnVsbClgIGlzIG5vdCBzdXBwb3J0ZWQgd2UgcHJlZml4IHRoZSBldmVudCBuYW1lcyB3aXRoIGFcbi8vIGB+YCB0byBtYWtlIHN1cmUgdGhhdCB0aGUgYnVpbHQtaW4gb2JqZWN0IHByb3BlcnRpZXMgYXJlIG5vdCBvdmVycmlkZGVuIG9yXG4vLyB1c2VkIGFzIGFuIGF0dGFjayB2ZWN0b3IuXG4vLyBXZSBhbHNvIGFzc3VtZSB0aGF0IGBPYmplY3QuY3JlYXRlKG51bGwpYCBpcyBhdmFpbGFibGUgd2hlbiB0aGUgZXZlbnQgbmFtZVxuLy8gaXMgYW4gRVM2IFN5bWJvbC5cbi8vXG52YXIgcHJlZml4ID0gdHlwZW9mIE9iamVjdC5jcmVhdGUgIT09ICdmdW5jdGlvbicgPyAnficgOiBmYWxzZTtcblxuLyoqXG4gKiBSZXByZXNlbnRhdGlvbiBvZiBhIHNpbmdsZSBFdmVudEVtaXR0ZXIgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gRXZlbnQgaGFuZGxlciB0byBiZSBjYWxsZWQuXG4gKiBAcGFyYW0ge01peGVkfSBjb250ZXh0IENvbnRleHQgZm9yIGZ1bmN0aW9uIGV4ZWN1dGlvbi5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29uY2U9ZmFsc2VdIE9ubHkgZW1pdCBvbmNlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRUUoZm4sIGNvbnRleHQsIG9uY2UpIHtcbiAgdGhpcy5mbiA9IGZuO1xuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLm9uY2UgPSBvbmNlIHx8IGZhbHNlO1xufVxuXG4vKipcbiAqIE1pbmltYWwgRXZlbnRFbWl0dGVyIGludGVyZmFjZSB0aGF0IGlzIG1vbGRlZCBhZ2FpbnN0IHRoZSBOb2RlLmpzXG4gKiBFdmVudEVtaXR0ZXIgaW50ZXJmYWNlLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkgeyAvKiBOb3RoaW5nIHRvIHNldCAqLyB9XG5cbi8qKlxuICogSG9sZCB0aGUgYXNzaWduZWQgRXZlbnRFbWl0dGVycyBieSBuYW1lLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5cbi8qKlxuICogUmV0dXJuIGFuIGFycmF5IGxpc3RpbmcgdGhlIGV2ZW50cyBmb3Igd2hpY2ggdGhlIGVtaXR0ZXIgaGFzIHJlZ2lzdGVyZWRcbiAqIGxpc3RlbmVycy5cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbiBldmVudE5hbWVzKCkge1xuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzXG4gICAgLCBuYW1lcyA9IFtdXG4gICAgLCBuYW1lO1xuXG4gIGlmICghZXZlbnRzKSByZXR1cm4gbmFtZXM7XG5cbiAgZm9yIChuYW1lIGluIGV2ZW50cykge1xuICAgIGlmIChoYXMuY2FsbChldmVudHMsIG5hbWUpKSBuYW1lcy5wdXNoKHByZWZpeCA/IG5hbWUuc2xpY2UoMSkgOiBuYW1lKTtcbiAgfVxuXG4gIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG4gICAgcmV0dXJuIG5hbWVzLmNvbmNhdChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGV2ZW50cykpO1xuICB9XG5cbiAgcmV0dXJuIG5hbWVzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYSBsaXN0IG9mIGFzc2lnbmVkIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50cyB0aGF0IHNob3VsZCBiZSBsaXN0ZWQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGV4aXN0cyBXZSBvbmx5IG5lZWQgdG8ga25vdyBpZiB0aGVyZSBhcmUgbGlzdGVuZXJzLlxuICogQHJldHVybnMge0FycmF5fEJvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIGxpc3RlbmVycyhldmVudCwgZXhpc3RzKSB7XG4gIHZhciBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50XG4gICAgLCBhdmFpbGFibGUgPSB0aGlzLl9ldmVudHMgJiYgdGhpcy5fZXZlbnRzW2V2dF07XG5cbiAgaWYgKGV4aXN0cykgcmV0dXJuICEhYXZhaWxhYmxlO1xuICBpZiAoIWF2YWlsYWJsZSkgcmV0dXJuIFtdO1xuICBpZiAoYXZhaWxhYmxlLmZuKSByZXR1cm4gW2F2YWlsYWJsZS5mbl07XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhdmFpbGFibGUubGVuZ3RoLCBlZSA9IG5ldyBBcnJheShsKTsgaSA8IGw7IGkrKykge1xuICAgIGVlW2ldID0gYXZhaWxhYmxlW2ldLmZuO1xuICB9XG5cbiAgcmV0dXJuIGVlO1xufTtcblxuLyoqXG4gKiBFbWl0IGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIG5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHJldHVybnMge0Jvb2xlYW59IEluZGljYXRpb24gaWYgd2UndmUgZW1pdHRlZCBhbiBldmVudC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQoZXZlbnQsIGExLCBhMiwgYTMsIGE0LCBhNSkge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW2V2dF0pIHJldHVybiBmYWxzZTtcblxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW2V2dF1cbiAgICAsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAsIGFyZ3NcbiAgICAsIGk7XG5cbiAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBsaXN0ZW5lcnMuZm4pIHtcbiAgICBpZiAobGlzdGVuZXJzLm9uY2UpIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVycy5mbiwgdW5kZWZpbmVkLCB0cnVlKTtcblxuICAgIHN3aXRjaCAobGVuKSB7XG4gICAgICBjYXNlIDE6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCksIHRydWU7XG4gICAgICBjYXNlIDI6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEpLCB0cnVlO1xuICAgICAgY2FzZSAzOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiksIHRydWU7XG4gICAgICBjYXNlIDQ6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMyksIHRydWU7XG4gICAgICBjYXNlIDU6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMywgYTQpLCB0cnVlO1xuICAgICAgY2FzZSA2OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMsIGE0LCBhNSksIHRydWU7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMSwgYXJncyA9IG5ldyBBcnJheShsZW4gLTEpOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgIH1cblxuICAgIGxpc3RlbmVycy5mbi5hcHBseShsaXN0ZW5lcnMuY29udGV4dCwgYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGhcbiAgICAgICwgajtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGxpc3RlbmVyc1tpXS5vbmNlKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcnNbaV0uZm4sIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cbiAgICAgIHN3aXRjaCAobGVuKSB7XG4gICAgICAgIGNhc2UgMTogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQpOyBicmVhaztcbiAgICAgICAgY2FzZSAyOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCwgYTEpOyBicmVhaztcbiAgICAgICAgY2FzZSAzOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCwgYTEsIGEyKTsgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaWYgKCFhcmdzKSBmb3IgKGogPSAxLCBhcmdzID0gbmV3IEFycmF5KGxlbiAtMSk7IGogPCBsZW47IGorKykge1xuICAgICAgICAgICAgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGlzdGVuZXJzW2ldLmZuLmFwcGx5KGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhcmdzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgYSBuZXcgRXZlbnRMaXN0ZW5lciBmb3IgdGhlIGdpdmVuIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBOYW1lIG9mIHRoZSBldmVudC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gW2NvbnRleHQ9dGhpc10gVGhlIGNvbnRleHQgb2YgdGhlIGZ1bmN0aW9uLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICB2YXIgbGlzdGVuZXIgPSBuZXcgRUUoZm4sIGNvbnRleHQgfHwgdGhpcylcbiAgICAsIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHByZWZpeCA/IHt9IDogT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XSkgdGhpcy5fZXZlbnRzW2V2dF0gPSBsaXN0ZW5lcjtcbiAgZWxzZSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XS5mbikgdGhpcy5fZXZlbnRzW2V2dF0ucHVzaChsaXN0ZW5lcik7XG4gICAgZWxzZSB0aGlzLl9ldmVudHNbZXZ0XSA9IFtcbiAgICAgIHRoaXMuX2V2ZW50c1tldnRdLCBsaXN0ZW5lclxuICAgIF07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIGFuIEV2ZW50TGlzdGVuZXIgdGhhdCdzIG9ubHkgY2FsbGVkIG9uY2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IE5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gQ2FsbGJhY2sgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge01peGVkfSBbY29udGV4dD10aGlzXSBUaGUgY29udGV4dCBvZiB0aGUgZnVuY3Rpb24uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiBvbmNlKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICB2YXIgbGlzdGVuZXIgPSBuZXcgRUUoZm4sIGNvbnRleHQgfHwgdGhpcywgdHJ1ZSlcbiAgICAsIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHByZWZpeCA/IHt9IDogT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XSkgdGhpcy5fZXZlbnRzW2V2dF0gPSBsaXN0ZW5lcjtcbiAgZWxzZSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XS5mbikgdGhpcy5fZXZlbnRzW2V2dF0ucHVzaChsaXN0ZW5lcik7XG4gICAgZWxzZSB0aGlzLl9ldmVudHNbZXZ0XSA9IFtcbiAgICAgIHRoaXMuX2V2ZW50c1tldnRdLCBsaXN0ZW5lclxuICAgIF07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50IHdlIHdhbnQgdG8gcmVtb3ZlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGxpc3RlbmVyIHRoYXQgd2UgbmVlZCB0byBmaW5kLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBPbmx5IHJlbW92ZSBsaXN0ZW5lcnMgbWF0Y2hpbmcgdGhpcyBjb250ZXh0LlxuICogQHBhcmFtIHtCb29sZWFufSBvbmNlIE9ubHkgcmVtb3ZlIG9uY2UgbGlzdGVuZXJzLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKGV2ZW50LCBmbiwgY29udGV4dCwgb25jZSkge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW2V2dF0pIHJldHVybiB0aGlzO1xuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbZXZ0XVxuICAgICwgZXZlbnRzID0gW107XG5cbiAgaWYgKGZuKSB7XG4gICAgaWYgKGxpc3RlbmVycy5mbikge1xuICAgICAgaWYgKFxuICAgICAgICAgICBsaXN0ZW5lcnMuZm4gIT09IGZuXG4gICAgICAgIHx8IChvbmNlICYmICFsaXN0ZW5lcnMub25jZSlcbiAgICAgICAgfHwgKGNvbnRleHQgJiYgbGlzdGVuZXJzLmNvbnRleHQgIT09IGNvbnRleHQpXG4gICAgICApIHtcbiAgICAgICAgZXZlbnRzLnB1c2gobGlzdGVuZXJzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgICAgbGlzdGVuZXJzW2ldLmZuICE9PSBmblxuICAgICAgICAgIHx8IChvbmNlICYmICFsaXN0ZW5lcnNbaV0ub25jZSlcbiAgICAgICAgICB8fCAoY29udGV4dCAmJiBsaXN0ZW5lcnNbaV0uY29udGV4dCAhPT0gY29udGV4dClcbiAgICAgICAgKSB7XG4gICAgICAgICAgZXZlbnRzLnB1c2gobGlzdGVuZXJzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vXG4gIC8vIFJlc2V0IHRoZSBhcnJheSwgb3IgcmVtb3ZlIGl0IGNvbXBsZXRlbHkgaWYgd2UgaGF2ZSBubyBtb3JlIGxpc3RlbmVycy5cbiAgLy9cbiAgaWYgKGV2ZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9ldmVudHNbZXZ0XSA9IGV2ZW50cy5sZW5ndGggPT09IDEgPyBldmVudHNbMF0gOiBldmVudHM7XG4gIH0gZWxzZSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1tldnRdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgbGlzdGVuZXJzIG9yIG9ubHkgdGhlIGxpc3RlbmVycyBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50IHdhbnQgdG8gcmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZm9yLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnMoZXZlbnQpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiB0aGlzO1xuXG4gIGlmIChldmVudCkgZGVsZXRlIHRoaXMuX2V2ZW50c1twcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50XTtcbiAgZWxzZSB0aGlzLl9ldmVudHMgPSBwcmVmaXggPyB7fSA6IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gQWxpYXMgbWV0aG9kcyBuYW1lcyBiZWNhdXNlIHBlb3BsZSByb2xsIGxpa2UgdGhhdC5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuLy9cbi8vIFRoaXMgZnVuY3Rpb24gZG9lc24ndCBhcHBseSBhbnltb3JlLlxuLy9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gc2V0TWF4TGlzdGVuZXJzKCkge1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vXG4vLyBFeHBvc2UgdGhlIHByZWZpeC5cbi8vXG5FdmVudEVtaXR0ZXIucHJlZml4ZWQgPSBwcmVmaXg7XG5cbi8vXG4vLyBFeHBvc2UgdGhlIG1vZHVsZS5cbi8vXG5pZiAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBtb2R1bGUpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG59XG4iLCIvKlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbnZhciBNZXNzYWdlID0gcmVxdWlyZSgnLi4vbWVzc2FnZScpO1xyXG5cclxuLyoqXHJcbiAqIFNlbmRzIGV2ZW50cyB0byB0aGUgZW1iZWRkZWQgVlIgdmlldyBJRnJhbWUgdmlhIHBvc3RNZXNzYWdlLiBBbHNvIGhhbmRsZXNcclxuICogbWVzc2FnZXMgc2VudCBiYWNrIGZyb20gdGhlIElGcmFtZTpcclxuICpcclxuICogICAgY2xpY2s6IFdoZW4gYSBob3RzcG90IHdhcyBjbGlja2VkLlxyXG4gKiAgICBtb2RlY2hhbmdlOiBXaGVuIHRoZSB1c2VyIGNoYW5nZXMgdmlld2luZyBtb2RlIChWUnxGdWxsc2NyZWVufGV0YykuXHJcbiAqL1xyXG5mdW5jdGlvbiBJRnJhbWVNZXNzYWdlU2VuZGVyKGlmcmFtZSkge1xyXG4gIGlmICghaWZyYW1lKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdObyBpZnJhbWUgc3BlY2lmaWVkJyk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHRoaXMuaWZyYW1lID0gaWZyYW1lO1xyXG5cclxuICAvLyBPbiBpT1MsIGlmIHRoZSBpZnJhbWUgaXMgYWNyb3NzIGRvbWFpbnMsIGFsc28gc2VuZCBEZXZpY2VNb3Rpb24gZGF0YS5cclxuICBpZiAodGhpcy5pc0lPU18oKSkge1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZW1vdGlvbicsIHRoaXMub25EZXZpY2VNb3Rpb25fLmJpbmQodGhpcyksIGZhbHNlKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZW5kcyBhIG1lc3NhZ2UgdG8gdGhlIGFzc29jaWF0ZWQgVlIgVmlldyBJRnJhbWUuXHJcbiAqL1xyXG5JRnJhbWVNZXNzYWdlU2VuZGVyLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24obWVzc2FnZSkge1xyXG4gIHZhciBpZnJhbWVXaW5kb3cgPSB0aGlzLmlmcmFtZS5jb250ZW50V2luZG93O1xyXG4gIGlmcmFtZVdpbmRvdy5wb3N0TWVzc2FnZShtZXNzYWdlLCAnKicpO1xyXG59O1xyXG5cclxuSUZyYW1lTWVzc2FnZVNlbmRlci5wcm90b3R5cGUub25EZXZpY2VNb3Rpb25fID0gZnVuY3Rpb24oZSkge1xyXG4gIHZhciBtZXNzYWdlID0ge1xyXG4gICAgdHlwZTogTWVzc2FnZS5ERVZJQ0VfTU9USU9OLFxyXG4gICAgZGV2aWNlTW90aW9uRXZlbnQ6IHRoaXMuY2xvbmVEZXZpY2VNb3Rpb25FdmVudF8oZSlcclxuICB9O1xyXG5cclxuICB0aGlzLnNlbmQobWVzc2FnZSk7XHJcbn07XHJcblxyXG5JRnJhbWVNZXNzYWdlU2VuZGVyLnByb3RvdHlwZS5jbG9uZURldmljZU1vdGlvbkV2ZW50XyA9IGZ1bmN0aW9uKGUpIHtcclxuICByZXR1cm4ge1xyXG4gICAgYWNjZWxlcmF0aW9uOiB7XHJcbiAgICAgIHg6IGUuYWNjZWxlcmF0aW9uLngsXHJcbiAgICAgIHk6IGUuYWNjZWxlcmF0aW9uLnksXHJcbiAgICAgIHo6IGUuYWNjZWxlcmF0aW9uLnosXHJcbiAgICB9LFxyXG4gICAgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eToge1xyXG4gICAgICB4OiBlLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkueCxcclxuICAgICAgeTogZS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LnksXHJcbiAgICAgIHo6IGUuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS56LFxyXG4gICAgfSxcclxuICAgIHJvdGF0aW9uUmF0ZToge1xyXG4gICAgICBhbHBoYTogZS5yb3RhdGlvblJhdGUuYWxwaGEsXHJcbiAgICAgIGJldGE6IGUucm90YXRpb25SYXRlLmJldGEsXHJcbiAgICAgIGdhbW1hOiBlLnJvdGF0aW9uUmF0ZS5nYW1tYSxcclxuICAgIH0sXHJcbiAgICBpbnRlcnZhbDogZS5pbnRlcnZhbCxcclxuICAgIHRpbWVTdGFtcDogZS50aW1lU3RhbXBcclxuICB9O1xyXG59O1xyXG5cclxuSUZyYW1lTWVzc2FnZVNlbmRlci5wcm90b3R5cGUuaXNJT1NfID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIC9pUGFkfGlQaG9uZXxpUG9kLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpICYmICF3aW5kb3cuTVNTdHJlYW07XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IElGcmFtZU1lc3NhZ2VTZW5kZXI7XHJcbiIsIi8qXHJcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuXHJcbnZhciBQbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xyXG5cclxudmFyIFZSVmlldyA9IHtcclxuICBQbGF5ZXI6IFBsYXllclxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBWUlZpZXc7XHJcbiIsIi8qXHJcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudGVtaXR0ZXIzJyk7XHJcbnZhciBJRnJhbWVNZXNzYWdlU2VuZGVyID0gcmVxdWlyZSgnLi9pZnJhbWUtbWVzc2FnZS1zZW5kZXInKTtcclxudmFyIE1lc3NhZ2UgPSByZXF1aXJlKCcuLi9tZXNzYWdlJyk7XHJcbnZhciBVdGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xyXG5cclxuLy8gU2F2ZSB0aGUgZXhlY3V0aW5nIHNjcmlwdC4gVGhpcyB3aWxsIGJlIHVzZWQgdG8gY2FsY3VsYXRlIHRoZSBlbWJlZCBVUkwuXHJcbnZhciBDVVJSRU5UX1NDUklQVF9TUkMgPSBVdGlsLmdldEN1cnJlbnRTY3JpcHQoKS5zcmM7XHJcbnZhciBGQUtFX0ZVTExTQ1JFRU5fQ0xBU1MgPSAndnJ2aWV3LWZha2UtZnVsbHNjcmVlbic7XHJcblxyXG4vKipcclxuICogRW50cnkgcG9pbnQgZm9yIHRoZSBWUiBWaWV3IEpTIEFQSS5cclxuICpcclxuICogRW1pdHMgdGhlIGZvbGxvd2luZyBldmVudHM6XHJcbiAqICAgIHJlYWR5OiBXaGVuIHRoZSBwbGF5ZXIgaXMgbG9hZGVkLlxyXG4gKiAgICBtb2RlY2hhbmdlOiBXaGVuIHRoZSB2aWV3aW5nIG1vZGUgY2hhbmdlcyAobm9ybWFsLCBmdWxsc2NyZWVuLCBWUikuXHJcbiAqICAgIGNsaWNrIChpZCk6IFdoZW4gYSBob3RzcG90IGlzIGNsaWNrZWQuXHJcbiAqL1xyXG5mdW5jdGlvbiBQbGF5ZXIoc2VsZWN0b3IsIGNvbnRlbnRJbmZvKSB7XHJcbiAgLy8gQ3JlYXRlIGEgVlIgVmlldyBpZnJhbWUgZGVwZW5kaW5nIG9uIHRoZSBwYXJhbWV0ZXJzLlxyXG4gIHZhciBpZnJhbWUgPSB0aGlzLmNyZWF0ZUlmcmFtZV8oY29udGVudEluZm8pO1xyXG4gIHRoaXMuaWZyYW1lID0gaWZyYW1lO1xyXG5cclxuICB2YXIgcGFyZW50RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcclxuICBwYXJlbnRFbC5hcHBlbmRDaGlsZChpZnJhbWUpO1xyXG5cclxuICAvLyBNYWtlIGEgc2VuZGVyIGFzIHdlbGwsIGZvciByZWx5aW5nIGNvbW1hbmRzIHRvIHRoZSBjaGlsZCBJRnJhbWUuXHJcbiAgdGhpcy5zZW5kZXIgPSBuZXcgSUZyYW1lTWVzc2FnZVNlbmRlcihpZnJhbWUpO1xyXG5cclxuICAvLyBMaXN0ZW4gdG8gbWVzc2FnZXMgZnJvbSB0aGUgSUZyYW1lLlxyXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgdGhpcy5vbk1lc3NhZ2VfLmJpbmQodGhpcyksIGZhbHNlKTtcclxuXHJcbiAgLy8gRXhwb3NlIGEgcHVibGljIC5pc1BhdXNlZCBhdHRyaWJ1dGUuXHJcbiAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xyXG5cclxuICBpZiAoVXRpbC5pc0lPUygpKSB7XHJcbiAgICB0aGlzLmluamVjdEZ1bGxzY3JlZW5TdHlsZXNoZWV0XygpO1xyXG4gIH1cclxufVxyXG5QbGF5ZXIucHJvdG90eXBlID0gbmV3IEV2ZW50RW1pdHRlcigpO1xyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSBwaXRjaCB7TnVtYmVyfSBUaGUgbGF0aXR1ZGUgb2YgY2VudGVyLCBzcGVjaWZpZWQgaW4gZGVncmVlcywgYmV0d2VlblxyXG4gKiAtOTAgYW5kIDkwLCB3aXRoIDAgYXQgdGhlIGhvcml6b24uXHJcbiAqIEBwYXJhbSB5YXcge051bWJlcn0gVGhlIGxvbmdpdHVkZSBvZiBjZW50ZXIsIHNwZWNpZmllZCBpbiBkZWdyZWVzLCBiZXR3ZWVuXHJcbiAqIC0xODAgYW5kIDE4MCwgd2l0aCAwIGF0IHRoZSBpbWFnZSBjZW50ZXIuXHJcbiAqIEBwYXJhbSByYWRpdXMge051bWJlcn0gVGhlIHJhZGl1cyBvZiB0aGUgaG90c3BvdCwgc3BlY2lmaWVkIGluIG1ldGVycy5cclxuICogQHBhcmFtIGRpc3RhbmNlIHtOdW1iZXJ9IFRoZSBkaXN0YW5jZSBvZiB0aGUgaG90c3BvdCBmcm9tIGNhbWVyYSwgc3BlY2lmaWVkXHJcbiAqIGluIG1ldGVycy5cclxuICogQHBhcmFtIGhvdHNwb3RJZCB7U3RyaW5nfSBUaGUgSUQgb2YgdGhlIGhvdHNwb3QuXHJcbiAqL1xyXG5QbGF5ZXIucHJvdG90eXBlLmFkZEhvdHNwb3QgPSBmdW5jdGlvbihob3RzcG90SWQsIHBhcmFtcykge1xyXG4gIC8vIFRPRE86IEFkZCB2YWxpZGF0aW9uIHRvIHBhcmFtcy5cclxuICB2YXIgZGF0YSA9IHtcclxuICAgIHBpdGNoOiBwYXJhbXMucGl0Y2gsXHJcbiAgICB5YXc6IHBhcmFtcy55YXcsXHJcbiAgICByYWRpdXM6IHBhcmFtcy5yYWRpdXMsXHJcbiAgICBkaXN0YW5jZTogcGFyYW1zLmRpc3RhbmNlLFxyXG4gICAgaWQ6IGhvdHNwb3RJZFxyXG4gIH07XHJcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5BRERfSE9UU1BPVCwgZGF0YTogZGF0YX0pO1xyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oKSB7XHJcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5QTEFZfSk7XHJcbn07XHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XHJcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5QQVVTRX0pO1xyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24oY29udGVudEluZm8pIHtcclxuICB0aGlzLmFic29sdXRpZnlQYXRoc18oY29udGVudEluZm8pO1xyXG4gIHZhciBkYXRhID0ge1xyXG4gICAgY29udGVudEluZm86IGNvbnRlbnRJbmZvXHJcbiAgfTtcclxuICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLlNFVF9DT05URU5ULCBkYXRhOiBkYXRhfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogU2V0cyB0aGUgc29mdHdhcmUgdm9sdW1lIG9mIHRoZSB2aWRlby4gMCBpcyBtdXRlLCAxIGlzIG1heC5cclxuICovXHJcblBsYXllci5wcm90b3R5cGUuc2V0Vm9sdW1lID0gZnVuY3Rpb24odm9sdW1lTGV2ZWwpIHtcclxuICB2YXIgZGF0YSA9IHtcclxuICAgIHZvbHVtZUxldmVsOiB2b2x1bWVMZXZlbFxyXG4gIH07XHJcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5TRVRfVk9MVU1FLCBkYXRhOiBkYXRhfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogSGVscGVyIGZvciBjcmVhdGluZyBhbiBpZnJhbWUuXHJcbiAqXHJcbiAqIEByZXR1cm4ge0lGcmFtZUVsZW1lbnR9IFRoZSBpZnJhbWUuXHJcbiAqL1xyXG5QbGF5ZXIucHJvdG90eXBlLmNyZWF0ZUlmcmFtZV8gPSBmdW5jdGlvbihjb250ZW50SW5mbykge1xyXG4gIHRoaXMuYWJzb2x1dGlmeVBhdGhzXyhjb250ZW50SW5mbyk7XHJcblxyXG4gIHZhciBpZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcclxuICBpZnJhbWUuc2V0QXR0cmlidXRlKCdhbGxvd2Z1bGxzY3JlZW4nLCB0cnVlKTtcclxuICBpZnJhbWUuc2V0QXR0cmlidXRlKCdzY3JvbGxpbmcnLCAnbm8nKTtcclxuICBpZnJhbWUuc3R5bGUuYm9yZGVyID0gMDtcclxuXHJcbiAgLy8gSGFuZGxlIGlmcmFtZSBzaXplIGlmIHdpZHRoIGFuZCBoZWlnaHQgYXJlIHNwZWNpZmllZC5cclxuICBpZiAoY29udGVudEluZm8uaGFzT3duUHJvcGVydHkoJ3dpZHRoJykpIHtcclxuICAgIGlmcmFtZS5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgY29udGVudEluZm8ud2lkdGgpO1xyXG4gICAgZGVsZXRlIGNvbnRlbnRJbmZvLndpZHRoO1xyXG4gIH1cclxuICBpZiAoY29udGVudEluZm8uaGFzT3duUHJvcGVydHkoJ2hlaWdodCcpKSB7XHJcbiAgICBpZnJhbWUuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBjb250ZW50SW5mby5oZWlnaHQpO1xyXG4gICAgZGVsZXRlIGNvbnRlbnRJbmZvLmhlaWdodDtcclxuICB9XHJcblxyXG4gIHZhciB1cmwgPSB0aGlzLmdldEVtYmVkVXJsXygpICsgVXRpbC5jcmVhdGVHZXRQYXJhbXMoY29udGVudEluZm8pO1xyXG4gIGlmcmFtZS5zcmMgPSB1cmw7XHJcblxyXG4gIHJldHVybiBpZnJhbWU7XHJcbn07XHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLm9uTWVzc2FnZV8gPSBmdW5jdGlvbihldmVudCkge1xyXG4gIHZhciBtZXNzYWdlID0gZXZlbnQuZGF0YTtcclxuICBpZiAoIW1lc3NhZ2UgfHwgIW1lc3NhZ2UudHlwZSkge1xyXG4gICAgY29uc29sZS53YXJuKCdSZWNlaXZlZCBtZXNzYWdlIHdpdGggbm8gdHlwZS4nKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdmFyIHR5cGUgPSBtZXNzYWdlLnR5cGUudG9Mb3dlckNhc2UoKTtcclxuICB2YXIgZGF0YSA9IG1lc3NhZ2UuZGF0YTtcclxuXHJcbiAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICBjYXNlICdyZWFkeSc6XHJcbiAgICBjYXNlICdtb2RlY2hhbmdlJzpcclxuICAgIGNhc2UgJ2Vycm9yJzpcclxuICAgIGNhc2UgJ2NsaWNrJzpcclxuICAgIGNhc2UgJ2dldHBvc2l0aW9uJzpcclxuICAgICAgdGhpcy5lbWl0KHR5cGUsIGRhdGEpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ3BhdXNlZCc6XHJcbiAgICAgIHRoaXMuaXNQYXVzZWQgPSBkYXRhO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ2VudGVyLWZ1bGxzY3JlZW4nOlxyXG4gICAgY2FzZSAnZW50ZXItdnInOlxyXG4gICAgICB0aGlzLnNldEZha2VGdWxsc2NyZWVuXyh0cnVlKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdleGl0LWZ1bGxzY3JlZW4nOlxyXG4gICAgICB0aGlzLnNldEZha2VGdWxsc2NyZWVuXyhmYWxzZSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgY29uc29sZS53YXJuKCdHb3QgdW5rbm93biBtZXNzYWdlIG9mIHR5cGUgJXMgZnJvbSAlcycsIG1lc3NhZ2UudHlwZSwgbWVzc2FnZS5vcmlnaW4pO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBOb3RlOiBpT1MgZG9lc24ndCBzdXBwb3J0IHRoZSBmdWxsc2NyZWVuIEFQSS5cclxuICogSW4gc3RhbmRhbG9uZSA8aWZyYW1lPiBtb2RlLCBWUiBWaWV3IGVtdWxhdGVzIGZ1bGxzY3JlZW4gYnkgcmVkaXJlY3RpbmcgdG9cclxuICogYW5vdGhlciBwYWdlLlxyXG4gKiBJbiBKUyBBUEkgbW9kZSwgd2Ugc3RyZXRjaCB0aGUgaWZyYW1lIHRvIGNvdmVyIHRoZSBleHRlbnQgb2YgdGhlIHBhZ2UgdXNpbmdcclxuICogQ1NTLiBUbyBkbyB0aGlzIGNsZWFubHksIHdlIGFsc28gaW5qZWN0IGEgc3R5bGVzaGVldC5cclxuICovXHJcblBsYXllci5wcm90b3R5cGUuc2V0RmFrZUZ1bGxzY3JlZW5fID0gZnVuY3Rpb24oaXNGdWxsc2NyZWVuKSB7XHJcbiAgaWYgKGlzRnVsbHNjcmVlbikge1xyXG4gICAgdGhpcy5pZnJhbWUuY2xhc3NMaXN0LmFkZChGQUtFX0ZVTExTQ1JFRU5fQ0xBU1MpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLmlmcmFtZS5jbGFzc0xpc3QucmVtb3ZlKEZBS0VfRlVMTFNDUkVFTl9DTEFTUyk7XHJcbiAgfVxyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5pbmplY3RGdWxsc2NyZWVuU3R5bGVzaGVldF8gPSBmdW5jdGlvbigpIHtcclxuICB2YXIgc3R5bGVTdHJpbmcgPSBbXHJcbiAgICAnaWZyYW1lLicgKyBGQUtFX0ZVTExTQ1JFRU5fQ0xBU1MsXHJcbiAgICAneycsXHJcbiAgICAgICdwb3NpdGlvbjogZml4ZWQgIWltcG9ydGFudDsnLFxyXG4gICAgICAnZGlzcGxheTogYmxvY2sgIWltcG9ydGFudDsnLFxyXG4gICAgICAnei1pbmRleDogOTk5OTk5OTk5OSAhaW1wb3J0YW50OycsXHJcbiAgICAgICd0b3A6IDAgIWltcG9ydGFudDsnLFxyXG4gICAgICAnbGVmdDogMCAhaW1wb3J0YW50OycsXHJcbiAgICAgICd3aWR0aDogMTAwJSAhaW1wb3J0YW50OycsXHJcbiAgICAgICdoZWlnaHQ6IDEwMCUgIWltcG9ydGFudDsnLFxyXG4gICAgICAnbWFyZ2luOiAwICFpbXBvcnRhbnQ7JyxcclxuICAgICd9JyxcclxuICBdLmpvaW4oJ1xcbicpO1xyXG4gIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XHJcbiAgc3R5bGUuaW5uZXJIVE1MID0gc3R5bGVTdHJpbmc7XHJcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzdHlsZSk7XHJcbn07XHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLmdldEVtYmVkVXJsXyA9IGZ1bmN0aW9uKCkge1xyXG4gIC8vIEFzc3VtZSB0aGF0IHRoZSBzY3JpcHQgaXMgaW4gJFJPT1QvYnVpbGQvc29tZXRoaW5nLmpzLCBhbmQgdGhhdCB0aGUgaWZyYW1lXHJcbiAgLy8gSFRNTCBpcyBpbiAkUk9PVC9pbmRleC5odG1sLlxyXG4gIC8vXHJcbiAgLy8gRS5nOiAvdnJ2aWV3LzIuMC9idWlsZC92cnZpZXcubWluLmpzID0+IC92cnZpZXcvMi4wL2luZGV4Lmh0bWwuXHJcbiAgdmFyIHBhdGggPSBDVVJSRU5UX1NDUklQVF9TUkM7XHJcbiAgdmFyIHNwbGl0ID0gcGF0aC5zcGxpdCgnLycpO1xyXG4gIHZhciByb290U3BsaXQgPSBzcGxpdC5zbGljZSgwLCBzcGxpdC5sZW5ndGggLSAyKTtcclxuICB2YXIgcm9vdFBhdGggPSByb290U3BsaXQuam9pbignLycpO1xyXG4gIHJldHVybiByb290UGF0aCArICcvaW5kZXguaHRtbCc7XHJcbn07XHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLmdldERpck5hbWVfID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIHBhdGggPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWU7XHJcbiAgcGF0aCA9IHBhdGguc3Vic3RyaW5nKDAsIHBhdGgubGFzdEluZGV4T2YoJy8nKSk7XHJcbiAgcmV0dXJuIGxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIGxvY2F0aW9uLmhvc3QgKyBwYXRoO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIE1ha2UgYWxsIG9mIHRoZSBVUkxzIGluc2lkZSBjb250ZW50SW5mbyBhYnNvbHV0ZSBpbnN0ZWFkIG9mIHJlbGF0aXZlLlxyXG4gKi9cclxuUGxheWVyLnByb3RvdHlwZS5hYnNvbHV0aWZ5UGF0aHNfID0gZnVuY3Rpb24oY29udGVudEluZm8pIHtcclxuICB2YXIgZGlyTmFtZSA9IHRoaXMuZ2V0RGlyTmFtZV8oKTtcclxuICB2YXIgdXJsUGFyYW1zID0gWydpbWFnZScsICdwcmV2aWV3JywgJ3ZpZGVvJ107XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdXJsUGFyYW1zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgbmFtZSA9IHVybFBhcmFtc1tpXTtcclxuICAgIHZhciBwYXRoID0gY29udGVudEluZm9bbmFtZV07XHJcbiAgICBpZiAocGF0aCAmJiBVdGlsLmlzUGF0aEFic29sdXRlKHBhdGgpKSB7XHJcbiAgICAgIHZhciBhYnNvbHV0ZSA9IFV0aWwucmVsYXRpdmVUb0Fic29sdXRlUGF0aChkaXJOYW1lLCBwYXRoKTtcclxuICAgICAgY29udGVudEluZm9bbmFtZV0gPSBhYnNvbHV0ZTtcclxuICAgICAgLy9jb25zb2xlLmxvZygnQ29udmVydGVkIHRvIGFic29sdXRlOiAlcycsIGFic29sdXRlKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcbi8qKlxyXG4gKiBHZXQgcG9zaXRpb24gWUFXLCBQSVRDSFxyXG4gKi9cclxuUGxheWVyLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5HRVRfUE9TSVRJT04sIGRhdGE6IHt9fSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllcjtcclxuIiwiLypcclxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIE1lc3NhZ2VzIGZyb20gdGhlIEFQSSB0byB0aGUgZW1iZWQuXHJcbiAqL1xyXG52YXIgTWVzc2FnZSA9IHtcclxuICBQTEFZOiAncGxheScsXHJcbiAgUEFVU0U6ICdwYXVzZScsXHJcbiAgQUREX0hPVFNQT1Q6ICdhZGRob3RzcG90JyxcclxuICBTRVRfQ09OVEVOVDogJ3NldGltYWdlJyxcclxuICBTRVRfVk9MVU1FOiAnc2V0dm9sdW1lJyxcclxuICBERVZJQ0VfTU9USU9OOiAnZGV2aWNlbW90aW9uJyxcclxuICBHRVRfUE9TSVRJT046ICdnZXRwb3NpdGlvbicsXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2U7XHJcbiIsIi8qXHJcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuXHJcblV0aWwgPSB3aW5kb3cuVXRpbCB8fCB7fTtcclxuXHJcblV0aWwuaXNEYXRhVVJJID0gZnVuY3Rpb24oc3JjKSB7XHJcbiAgcmV0dXJuIHNyYyAmJiBzcmMuaW5kZXhPZignZGF0YTonKSA9PSAwO1xyXG59O1xyXG5cclxuVXRpbC5nZW5lcmF0ZVVVSUQgPSBmdW5jdGlvbigpIHtcclxuICBmdW5jdGlvbiBzNCgpIHtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKCgxICsgTWF0aC5yYW5kb20oKSkgKiAweDEwMDAwKVxyXG4gICAgLnRvU3RyaW5nKDE2KVxyXG4gICAgLnN1YnN0cmluZygxKTtcclxuICB9XHJcbiAgcmV0dXJuIHM0KCkgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArIHM0KCkgKyAnLScgK1xyXG4gICAgczQoKSArICctJyArIHM0KCkgKyBzNCgpICsgczQoKTtcclxufTtcclxuXHJcblV0aWwuaXNNb2JpbGUgPSBmdW5jdGlvbigpIHtcclxuICB2YXIgY2hlY2sgPSBmYWxzZTtcclxuICAoZnVuY3Rpb24oYSl7aWYoLyhhbmRyb2lkfGJiXFxkK3xtZWVnbykuK21vYmlsZXxhdmFudGdvfGJhZGFcXC98YmxhY2tiZXJyeXxibGF6ZXJ8Y29tcGFsfGVsYWluZXxmZW5uZWN8aGlwdG9wfGllbW9iaWxlfGlwKGhvbmV8b2QpfGlyaXN8a2luZGxlfGxnZSB8bWFlbW98bWlkcHxtbXB8bW9iaWxlLitmaXJlZm94fG5ldGZyb250fG9wZXJhIG0ob2J8aW4paXxwYWxtKCBvcyk/fHBob25lfHAoaXhpfHJlKVxcL3xwbHVja2VyfHBvY2tldHxwc3B8c2VyaWVzKDR8NikwfHN5bWJpYW58dHJlb3x1cFxcLihicm93c2VyfGxpbmspfHZvZGFmb25lfHdhcHx3aW5kb3dzIGNlfHhkYXx4aWluby9pLnRlc3QoYSl8fC8xMjA3fDYzMTB8NjU5MHwzZ3NvfDR0aHB8NTBbMS02XWl8Nzcwc3w4MDJzfGEgd2F8YWJhY3xhYyhlcnxvb3xzXFwtKXxhaShrb3xybil8YWwoYXZ8Y2F8Y28pfGFtb2l8YW4oZXh8bnl8eXcpfGFwdHV8YXIoY2h8Z28pfGFzKHRlfHVzKXxhdHR3fGF1KGRpfFxcLW18ciB8cyApfGF2YW58YmUoY2t8bGx8bnEpfGJpKGxifHJkKXxibChhY3xheil8YnIoZXx2KXd8YnVtYnxid1xcLShufHUpfGM1NVxcL3xjYXBpfGNjd2F8Y2RtXFwtfGNlbGx8Y2h0bXxjbGRjfGNtZFxcLXxjbyhtcHxuZCl8Y3Jhd3xkYShpdHxsbHxuZyl8ZGJ0ZXxkY1xcLXN8ZGV2aXxkaWNhfGRtb2J8ZG8oY3xwKW98ZHMoMTJ8XFwtZCl8ZWwoNDl8YWkpfGVtKGwyfHVsKXxlcihpY3xrMCl8ZXNsOHxleihbNC03XTB8b3N8d2F8emUpfGZldGN8Zmx5KFxcLXxfKXxnMSB1fGc1NjB8Z2VuZXxnZlxcLTV8Z1xcLW1vfGdvKFxcLnd8b2QpfGdyKGFkfHVuKXxoYWllfGhjaXR8aGRcXC0obXxwfHQpfGhlaVxcLXxoaShwdHx0YSl8aHAoIGl8aXApfGhzXFwtY3xodChjKFxcLXwgfF98YXxnfHB8c3x0KXx0cCl8aHUoYXd8dGMpfGlcXC0oMjB8Z298bWEpfGkyMzB8aWFjKCB8XFwtfFxcLyl8aWJyb3xpZGVhfGlnMDF8aWtvbXxpbTFrfGlubm98aXBhcXxpcmlzfGphKHR8dilhfGpicm98amVtdXxqaWdzfGtkZGl8a2VqaXxrZ3QoIHxcXC8pfGtsb258a3B0IHxrd2NcXC18a3lvKGN8ayl8bGUobm98eGkpfGxnKCBnfFxcLyhrfGx8dSl8NTB8NTR8XFwtW2Etd10pfGxpYnd8bHlueHxtMVxcLXd8bTNnYXxtNTBcXC98bWEodGV8dWl8eG8pfG1jKDAxfDIxfGNhKXxtXFwtY3J8bWUocmN8cmkpfG1pKG84fG9hfHRzKXxtbWVmfG1vKDAxfDAyfGJpfGRlfGRvfHQoXFwtfCB8b3x2KXx6eil8bXQoNTB8cDF8diApfG13YnB8bXl3YXxuMTBbMC0yXXxuMjBbMi0zXXxuMzAoMHwyKXxuNTAoMHwyfDUpfG43KDAoMHwxKXwxMCl8bmUoKGN8bSlcXC18b258dGZ8d2Z8d2d8d3QpfG5vayg2fGkpfG56cGh8bzJpbXxvcCh0aXx3dil8b3Jhbnxvd2cxfHA4MDB8cGFuKGF8ZHx0KXxwZHhnfHBnKDEzfFxcLShbMS04XXxjKSl8cGhpbHxwaXJlfHBsKGF5fHVjKXxwblxcLTJ8cG8oY2t8cnR8c2UpfHByb3h8cHNpb3xwdFxcLWd8cWFcXC1hfHFjKDA3fDEyfDIxfDMyfDYwfFxcLVsyLTddfGlcXC0pfHF0ZWt8cjM4MHxyNjAwfHJha3N8cmltOXxybyh2ZXx6byl8czU1XFwvfHNhKGdlfG1hfG1tfG1zfG55fHZhKXxzYygwMXxoXFwtfG9vfHBcXC0pfHNka1xcL3xzZShjKFxcLXwwfDEpfDQ3fG1jfG5kfHJpKXxzZ2hcXC18c2hhcnxzaWUoXFwtfG0pfHNrXFwtMHxzbCg0NXxpZCl8c20oYWx8YXJ8YjN8aXR8dDUpfHNvKGZ0fG55KXxzcCgwMXxoXFwtfHZcXC18diApfHN5KDAxfG1iKXx0MigxOHw1MCl8dDYoMDB8MTB8MTgpfHRhKGd0fGxrKXx0Y2xcXC18dGRnXFwtfHRlbChpfG0pfHRpbVxcLXx0XFwtbW98dG8ocGx8c2gpfHRzKDcwfG1cXC18bTN8bTUpfHR4XFwtOXx1cChcXC5ifGcxfHNpKXx1dHN0fHY0MDB8djc1MHx2ZXJpfHZpKHJnfHRlKXx2ayg0MHw1WzAtM118XFwtdil8dm00MHx2b2RhfHZ1bGN8dngoNTJ8NTN8NjB8NjF8NzB8ODB8ODF8ODN8ODV8OTgpfHczYyhcXC18ICl8d2ViY3x3aGl0fHdpKGcgfG5jfG53KXx3bWxifHdvbnV8eDcwMHx5YXNcXC18eW91cnx6ZXRvfHp0ZVxcLS9pLnRlc3QoYS5zdWJzdHIoMCw0KSkpY2hlY2sgPSB0cnVlfSkobmF2aWdhdG9yLnVzZXJBZ2VudHx8bmF2aWdhdG9yLnZlbmRvcnx8d2luZG93Lm9wZXJhKTtcclxuICByZXR1cm4gY2hlY2s7XHJcbn07XHJcblxyXG5VdGlsLmlzSU9TID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIC8oaVBhZHxpUGhvbmV8aVBvZCkvZy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xyXG59O1xyXG5cclxuVXRpbC5pc1NhZmFyaSA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiAvXigoPyFjaHJvbWV8YW5kcm9pZCkuKSpzYWZhcmkvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xyXG59O1xyXG5cclxuVXRpbC5jbG9uZU9iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xyXG4gIHZhciBvdXQgPSB7fTtcclxuICBmb3IgKGtleSBpbiBvYmopIHtcclxuICAgIG91dFtrZXldID0gb2JqW2tleV07XHJcbiAgfVxyXG4gIHJldHVybiBvdXQ7XHJcbn07XHJcblxyXG5VdGlsLmhhc2hDb2RlID0gZnVuY3Rpb24ocykge1xyXG4gIHJldHVybiBzLnNwbGl0KFwiXCIpLnJlZHVjZShmdW5jdGlvbihhLGIpe2E9KChhPDw1KS1hKStiLmNoYXJDb2RlQXQoMCk7cmV0dXJuIGEmYX0sMCk7XHJcbn07XHJcblxyXG5VdGlsLmxvYWRUcmFja1NyYyA9IGZ1bmN0aW9uKGNvbnRleHQsIHNyYywgY2FsbGJhY2ssIG9wdF9wcm9ncmVzc0NhbGxiYWNrKSB7XHJcbiAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuICByZXF1ZXN0Lm9wZW4oJ0dFVCcsIHNyYywgdHJ1ZSk7XHJcbiAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xyXG5cclxuICAvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHkuXHJcbiAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcclxuICAgIGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcXVlc3QucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xyXG4gICAgICBjYWxsYmFjayhidWZmZXIpO1xyXG4gICAgfSwgZnVuY3Rpb24oZSkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGUpO1xyXG4gICAgfSk7XHJcbiAgfTtcclxuICBpZiAob3B0X3Byb2dyZXNzQ2FsbGJhY2spIHtcclxuICAgIHJlcXVlc3Qub25wcm9ncmVzcyA9IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgdmFyIHBlcmNlbnQgPSBlLmxvYWRlZCAvIGUudG90YWw7XHJcbiAgICAgIG9wdF9wcm9ncmVzc0NhbGxiYWNrKHBlcmNlbnQpO1xyXG4gICAgfTtcclxuICB9XHJcbiAgcmVxdWVzdC5zZW5kKCk7XHJcbn07XHJcblxyXG5VdGlsLmlzUG93MiA9IGZ1bmN0aW9uKG4pIHtcclxuICByZXR1cm4gKG4gJiAobiAtIDEpKSA9PSAwO1xyXG59O1xyXG5cclxuVXRpbC5jYXBpdGFsaXplID0gZnVuY3Rpb24ocykge1xyXG4gIHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKTtcclxufTtcclxuXHJcblV0aWwuaXNJRnJhbWUgPSBmdW5jdGlvbigpIHtcclxuICB0cnkge1xyXG4gICAgcmV0dXJuIHdpbmRvdy5zZWxmICE9PSB3aW5kb3cudG9wO1xyXG4gIH0gY2F0Y2ggKGUpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxufTtcclxuXHJcbi8vIEZyb20gaHR0cDovL2dvby5nbC80V1gzdGdcclxuVXRpbC5nZXRRdWVyeVBhcmFtZXRlciA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpO1xyXG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpLFxyXG4gICAgICByZXN1bHRzID0gcmVnZXguZXhlYyhsb2NhdGlvbi5zZWFyY2gpO1xyXG4gIHJldHVybiByZXN1bHRzID09PSBudWxsID8gXCJcIiA6IGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpO1xyXG59O1xyXG5cclxuXHJcbi8vIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMTg3MTA3Ny9wcm9wZXItd2F5LXRvLWRldGVjdC13ZWJnbC1zdXBwb3J0LlxyXG5VdGlsLmlzV2ViR0xFbmFibGVkID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xyXG4gIHRyeSB7IGdsID0gY2FudmFzLmdldENvbnRleHQoXCJ3ZWJnbFwiKTsgfVxyXG4gIGNhdGNoICh4KSB7IGdsID0gbnVsbDsgfVxyXG5cclxuICBpZiAoZ2wgPT0gbnVsbCkge1xyXG4gICAgdHJ5IHsgZ2wgPSBjYW52YXMuZ2V0Q29udGV4dChcImV4cGVyaW1lbnRhbC13ZWJnbFwiKTsgZXhwZXJpbWVudGFsID0gdHJ1ZTsgfVxyXG4gICAgY2F0Y2ggKHgpIHsgZ2wgPSBudWxsOyB9XHJcbiAgfVxyXG4gIHJldHVybiAhIWdsO1xyXG59O1xyXG5cclxuVXRpbC5jbG9uZSA9IGZ1bmN0aW9uKG9iaikge1xyXG4gIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9iaikpO1xyXG59O1xyXG5cclxuLy8gRnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwMTQwNjA0L2Zhc3Rlc3QtaHlwb3RlbnVzZS1pbi1qYXZhc2NyaXB0XHJcblV0aWwuaHlwb3QgPSBNYXRoLmh5cG90IHx8IGZ1bmN0aW9uKHgsIHkpIHtcclxuICByZXR1cm4gTWF0aC5zcXJ0KHgqeCArIHkqeSk7XHJcbn07XHJcblxyXG4vLyBGcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzE3NDQ3NzE4LzY5MzkzNFxyXG5VdGlsLmlzSUUxMSA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9UcmlkZW50Lyk7XHJcbn07XHJcblxyXG5VdGlsLmdldFJlY3RDZW50ZXIgPSBmdW5jdGlvbihyZWN0KSB7XHJcbiAgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IyKHJlY3QueCArIHJlY3Qud2lkdGgvMiwgcmVjdC55ICsgcmVjdC5oZWlnaHQvMik7XHJcbn07XHJcblxyXG5VdGlsLmdldFNjcmVlbldpZHRoID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIE1hdGgubWF4KHdpbmRvdy5zY3JlZW4ud2lkdGgsIHdpbmRvdy5zY3JlZW4uaGVpZ2h0KSAqXHJcbiAgICAgIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xyXG59O1xyXG5cclxuVXRpbC5nZXRTY3JlZW5IZWlnaHQgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gTWF0aC5taW4od2luZG93LnNjcmVlbi53aWR0aCwgd2luZG93LnNjcmVlbi5oZWlnaHQpICpcclxuICAgICAgd2luZG93LmRldmljZVBpeGVsUmF0aW87XHJcbn07XHJcblxyXG5VdGlsLmlzSU9TOU9yTGVzcyA9IGZ1bmN0aW9uKCkge1xyXG4gIGlmICghVXRpbC5pc0lPUygpKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIHZhciByZSA9IC8oaVBob25lfGlQYWR8aVBvZCkgT1MgKFtcXGRfXSspLztcclxuICB2YXIgaU9TVmVyc2lvbiA9IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2gocmUpO1xyXG4gIGlmICghaU9TVmVyc2lvbikge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuICAvLyBHZXQgdGhlIGxhc3QgZ3JvdXAuXHJcbiAgdmFyIHZlcnNpb25TdHJpbmcgPSBpT1NWZXJzaW9uW2lPU1ZlcnNpb24ubGVuZ3RoIC0gMV07XHJcbiAgdmFyIG1ham9yVmVyc2lvbiA9IHBhcnNlRmxvYXQodmVyc2lvblN0cmluZyk7XHJcbiAgcmV0dXJuIG1ham9yVmVyc2lvbiA8PSA5O1xyXG59O1xyXG5cclxuVXRpbC5nZXRFeHRlbnNpb24gPSBmdW5jdGlvbih1cmwpIHtcclxuICByZXR1cm4gdXJsLnNwbGl0KCcuJykucG9wKCk7XHJcbn07XHJcblxyXG5VdGlsLmNyZWF0ZUdldFBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcykge1xyXG4gIHZhciBvdXQgPSAnPyc7XHJcbiAgZm9yICh2YXIgayBpbiBwYXJhbXMpIHtcclxuICAgIHZhciBwYXJhbVN0cmluZyA9IGsgKyAnPScgKyBwYXJhbXNba10gKyAnJic7XHJcbiAgICBvdXQgKz0gcGFyYW1TdHJpbmc7XHJcbiAgfVxyXG4gIC8vIFJlbW92ZSB0aGUgdHJhaWxpbmcgYW1wZXJzYW5kLlxyXG4gIG91dC5zdWJzdHJpbmcoMCwgcGFyYW1zLmxlbmd0aCAtIDIpO1xyXG4gIHJldHVybiBvdXQ7XHJcbn07XHJcblxyXG5VdGlsLnNlbmRQYXJlbnRNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xyXG4gIGlmICh3aW5kb3cucGFyZW50KSB7XHJcbiAgICBwYXJlbnQucG9zdE1lc3NhZ2UobWVzc2FnZSwgJyonKTtcclxuICB9XHJcbn07XHJcblxyXG5VdGlsLnBhcnNlQm9vbGVhbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XHJcbiAgaWYgKHZhbHVlID09ICdmYWxzZScgfHwgdmFsdWUgPT0gMCkge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAodmFsdWUgPT0gJ3RydWUnIHx8IHZhbHVlID09IDEpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gISF2YWx1ZTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogQHBhcmFtIGJhc2Uge1N0cmluZ30gQW4gYWJzb2x1dGUgZGlyZWN0b3J5IHJvb3QuXHJcbiAqIEBwYXJhbSByZWxhdGl2ZSB7U3RyaW5nfSBBIHJlbGF0aXZlIHBhdGguXHJcbiAqXHJcbiAqIEByZXR1cm5zIHtTdHJpbmd9IEFuIGFic29sdXRlIHBhdGggY29ycmVzcG9uZGluZyB0byB0aGUgcm9vdFBhdGguXHJcbiAqXHJcbiAqIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTQ3ODA0NjMvNjkzOTM0LlxyXG4gKi9cclxuVXRpbC5yZWxhdGl2ZVRvQWJzb2x1dGVQYXRoID0gZnVuY3Rpb24oYmFzZSwgcmVsYXRpdmUpIHtcclxuICB2YXIgc3RhY2sgPSBiYXNlLnNwbGl0KCcvJyk7XHJcbiAgdmFyIHBhcnRzID0gcmVsYXRpdmUuc3BsaXQoJy8nKTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAocGFydHNbaV0gPT0gJy4nKSB7XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG4gICAgaWYgKHBhcnRzW2ldID09ICcuLicpIHtcclxuICAgICAgc3RhY2sucG9wKCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzdGFjay5wdXNoKHBhcnRzW2ldKTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIHN0YWNrLmpvaW4oJy8nKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmZiB0aGUgc3BlY2lmaWVkIHBhdGggaXMgYW4gYWJzb2x1dGUgcGF0aC5cclxuICovXHJcblV0aWwuaXNQYXRoQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XHJcbiAgcmV0dXJuICEgL14oPzpcXC98W2Etel0rOlxcL1xcLykvLnRlc3QocGF0aCk7XHJcbn1cclxuXHJcblV0aWwuaXNFbXB0eU9iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xyXG4gIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopLmxlbmd0aCA9PSAwO1xyXG59O1xyXG5cclxuVXRpbC5pc0RlYnVnID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIFV0aWwucGFyc2VCb29sZWFuKFV0aWwuZ2V0UXVlcnlQYXJhbWV0ZXIoJ2RlYnVnJykpO1xyXG59O1xyXG5cclxuVXRpbC5nZXRDdXJyZW50U2NyaXB0ID0gZnVuY3Rpb24oKSB7XHJcbiAgLy8gTm90ZTogaW4gSUUxMSwgZG9jdW1lbnQuY3VycmVudFNjcmlwdCBkb2Vzbid0IHdvcmssIHNvIHdlIGZhbGwgYmFjayB0byB0aGlzXHJcbiAgLy8gaGFjaywgdGFrZW4gZnJvbSBodHRwczovL2dvby5nbC9UcEV4dUguXHJcbiAgaWYgKCFkb2N1bWVudC5jdXJyZW50U2NyaXB0KSB7XHJcbiAgICBjb25zb2xlLndhcm4oJ1RoaXMgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGRvY3VtZW50LmN1cnJlbnRTY3JpcHQuIFRyeWluZyBmYWxsYmFjay4nKTtcclxuICB9XHJcbiAgcmV0dXJuIGRvY3VtZW50LmN1cnJlbnRTY3JpcHQgfHwgZG9jdW1lbnQuc2NyaXB0c1tkb2N1bWVudC5zY3JpcHRzLmxlbmd0aCAtIDFdO1xyXG59XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBVdGlsO1xyXG4iXX0=
