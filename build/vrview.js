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
  var type = message.type.toLowerCase();
  var data = message.data;

  switch (type) {
    case 'ready':
    case 'modechange':
    case 'error':
    case 'click':
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL2hvbWVicmV3L2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9ldmVudGVtaXR0ZXIzL2luZGV4LmpzIiwic3JjL2FwaS9pZnJhbWUtbWVzc2FnZS1zZW5kZXIuanMiLCJzcmMvYXBpL21haW4uanMiLCJzcmMvYXBpL3BsYXllci5qcyIsInNyYy9tZXNzYWdlLmpzIiwic3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vL1xuLy8gV2Ugc3RvcmUgb3VyIEVFIG9iamVjdHMgaW4gYSBwbGFpbiBvYmplY3Qgd2hvc2UgcHJvcGVydGllcyBhcmUgZXZlbnQgbmFtZXMuXG4vLyBJZiBgT2JqZWN0LmNyZWF0ZShudWxsKWAgaXMgbm90IHN1cHBvcnRlZCB3ZSBwcmVmaXggdGhlIGV2ZW50IG5hbWVzIHdpdGggYVxuLy8gYH5gIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSBidWlsdC1pbiBvYmplY3QgcHJvcGVydGllcyBhcmUgbm90IG92ZXJyaWRkZW4gb3Jcbi8vIHVzZWQgYXMgYW4gYXR0YWNrIHZlY3Rvci5cbi8vIFdlIGFsc28gYXNzdW1lIHRoYXQgYE9iamVjdC5jcmVhdGUobnVsbClgIGlzIGF2YWlsYWJsZSB3aGVuIHRoZSBldmVudCBuYW1lXG4vLyBpcyBhbiBFUzYgU3ltYm9sLlxuLy9cbnZhciBwcmVmaXggPSB0eXBlb2YgT2JqZWN0LmNyZWF0ZSAhPT0gJ2Z1bmN0aW9uJyA/ICd+JyA6IGZhbHNlO1xuXG4vKipcbiAqIFJlcHJlc2VudGF0aW9uIG9mIGEgc2luZ2xlIEV2ZW50RW1pdHRlciBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBFdmVudCBoYW5kbGVyIHRvIGJlIGNhbGxlZC5cbiAqIEBwYXJhbSB7TWl4ZWR9IGNvbnRleHQgQ29udGV4dCBmb3IgZnVuY3Rpb24gZXhlY3V0aW9uLlxuICogQHBhcmFtIHtCb29sZWFufSBbb25jZT1mYWxzZV0gT25seSBlbWl0IG9uY2VcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBFRShmbiwgY29udGV4dCwgb25jZSkge1xuICB0aGlzLmZuID0gZm47XG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMub25jZSA9IG9uY2UgfHwgZmFsc2U7XG59XG5cbi8qKlxuICogTWluaW1hbCBFdmVudEVtaXR0ZXIgaW50ZXJmYWNlIHRoYXQgaXMgbW9sZGVkIGFnYWluc3QgdGhlIE5vZGUuanNcbiAqIEV2ZW50RW1pdHRlciBpbnRlcmZhY2UuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7IC8qIE5vdGhpbmcgdG8gc2V0ICovIH1cblxuLyoqXG4gKiBIb2xkIHRoZSBhc3NpZ25lZCBFdmVudEVtaXR0ZXJzIGJ5IG5hbWUuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqIEBwcml2YXRlXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBSZXR1cm4gYW4gYXJyYXkgbGlzdGluZyB0aGUgZXZlbnRzIGZvciB3aGljaCB0aGUgZW1pdHRlciBoYXMgcmVnaXN0ZXJlZFxuICogbGlzdGVuZXJzLlxuICpcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnROYW1lcyA9IGZ1bmN0aW9uIGV2ZW50TmFtZXMoKSB7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNcbiAgICAsIG5hbWVzID0gW11cbiAgICAsIG5hbWU7XG5cbiAgaWYgKCFldmVudHMpIHJldHVybiBuYW1lcztcblxuICBmb3IgKG5hbWUgaW4gZXZlbnRzKSB7XG4gICAgaWYgKGhhcy5jYWxsKGV2ZW50cywgbmFtZSkpIG5hbWVzLnB1c2gocHJlZml4ID8gbmFtZS5zbGljZSgxKSA6IG5hbWUpO1xuICB9XG5cbiAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMpIHtcbiAgICByZXR1cm4gbmFtZXMuY29uY2F0KE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZXZlbnRzKSk7XG4gIH1cblxuICByZXR1cm4gbmFtZXM7XG59O1xuXG4vKipcbiAqIFJldHVybiBhIGxpc3Qgb2YgYXNzaWduZWQgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgZXZlbnRzIHRoYXQgc2hvdWxkIGJlIGxpc3RlZC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZXhpc3RzIFdlIG9ubHkgbmVlZCB0byBrbm93IGlmIHRoZXJlIGFyZSBsaXN0ZW5lcnMuXG4gKiBAcmV0dXJucyB7QXJyYXl8Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24gbGlzdGVuZXJzKGV2ZW50LCBleGlzdHMpIHtcbiAgdmFyIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnRcbiAgICAsIGF2YWlsYWJsZSA9IHRoaXMuX2V2ZW50cyAmJiB0aGlzLl9ldmVudHNbZXZ0XTtcblxuICBpZiAoZXhpc3RzKSByZXR1cm4gISFhdmFpbGFibGU7XG4gIGlmICghYXZhaWxhYmxlKSByZXR1cm4gW107XG4gIGlmIChhdmFpbGFibGUuZm4pIHJldHVybiBbYXZhaWxhYmxlLmZuXTtcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGF2YWlsYWJsZS5sZW5ndGgsIGVlID0gbmV3IEFycmF5KGwpOyBpIDwgbDsgaSsrKSB7XG4gICAgZWVbaV0gPSBhdmFpbGFibGVbaV0uZm47XG4gIH1cblxuICByZXR1cm4gZWU7XG59O1xuXG4vKipcbiAqIEVtaXQgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgbmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gSW5kaWNhdGlvbiBpZiB3ZSd2ZSBlbWl0dGVkIGFuIGV2ZW50LlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdChldmVudCwgYTEsIGEyLCBhMywgYTQsIGE1KSB7XG4gIHZhciBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbZXZ0XSkgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbZXZ0XVxuICAgICwgbGVuID0gYXJndW1lbnRzLmxlbmd0aFxuICAgICwgYXJnc1xuICAgICwgaTtcblxuICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGxpc3RlbmVycy5mbikge1xuICAgIGlmIChsaXN0ZW5lcnMub25jZSkgdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgbGlzdGVuZXJzLmZuLCB1bmRlZmluZWQsIHRydWUpO1xuXG4gICAgc3dpdGNoIChsZW4pIHtcbiAgICAgIGNhc2UgMTogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0KSwgdHJ1ZTtcbiAgICAgIGNhc2UgMjogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSksIHRydWU7XG4gICAgICBjYXNlIDM6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyKSwgdHJ1ZTtcbiAgICAgIGNhc2UgNDogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIsIGEzKSwgdHJ1ZTtcbiAgICAgIGNhc2UgNTogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIsIGEzLCBhNCksIHRydWU7XG4gICAgICBjYXNlIDY6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMywgYTQsIGE1KSwgdHJ1ZTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAxLCBhcmdzID0gbmV3IEFycmF5KGxlbiAtMSk7IGkgPCBsZW47IGkrKykge1xuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgfVxuXG4gICAgbGlzdGVuZXJzLmZuLmFwcGx5KGxpc3RlbmVycy5jb250ZXh0LCBhcmdzKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbGVuZ3RoID0gbGlzdGVuZXJzLmxlbmd0aFxuICAgICAgLCBqO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobGlzdGVuZXJzW2ldLm9uY2UpIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyc1tpXS5mbiwgdW5kZWZpbmVkLCB0cnVlKTtcblxuICAgICAgc3dpdGNoIChsZW4pIHtcbiAgICAgICAgY2FzZSAxOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCk7IGJyZWFrO1xuICAgICAgICBjYXNlIDI6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhMSk7IGJyZWFrO1xuICAgICAgICBjYXNlIDM6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhMSwgYTIpOyBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBpZiAoIWFyZ3MpIGZvciAoaiA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgICBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaXN0ZW5lcnNbaV0uZm4uYXBwbHkobGlzdGVuZXJzW2ldLmNvbnRleHQsIGFyZ3MpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhIG5ldyBFdmVudExpc3RlbmVyIGZvciB0aGUgZ2l2ZW4gZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IE5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gQ2FsbGJhY2sgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge01peGVkfSBbY29udGV4dD10aGlzXSBUaGUgY29udGV4dCBvZiB0aGUgZnVuY3Rpb24uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oZXZlbnQsIGZuLCBjb250ZXh0KSB7XG4gIHZhciBsaXN0ZW5lciA9IG5ldyBFRShmbiwgY29udGV4dCB8fCB0aGlzKVxuICAgICwgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0gcHJlZml4ID8ge30gOiBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdKSB0aGlzLl9ldmVudHNbZXZ0XSA9IGxpc3RlbmVyO1xuICBlbHNlIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdLmZuKSB0aGlzLl9ldmVudHNbZXZ0XS5wdXNoKGxpc3RlbmVyKTtcbiAgICBlbHNlIHRoaXMuX2V2ZW50c1tldnRdID0gW1xuICAgICAgdGhpcy5fZXZlbnRzW2V2dF0sIGxpc3RlbmVyXG4gICAgXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGQgYW4gRXZlbnRMaXN0ZW5lciB0aGF0J3Mgb25seSBjYWxsZWQgb25jZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgTmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IFtjb250ZXh0PXRoaXNdIFRoZSBjb250ZXh0IG9mIHRoZSBmdW5jdGlvbi5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uIG9uY2UoZXZlbnQsIGZuLCBjb250ZXh0KSB7XG4gIHZhciBsaXN0ZW5lciA9IG5ldyBFRShmbiwgY29udGV4dCB8fCB0aGlzLCB0cnVlKVxuICAgICwgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0gcHJlZml4ID8ge30gOiBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdKSB0aGlzLl9ldmVudHNbZXZ0XSA9IGxpc3RlbmVyO1xuICBlbHNlIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50c1tldnRdLmZuKSB0aGlzLl9ldmVudHNbZXZ0XS5wdXNoKGxpc3RlbmVyKTtcbiAgICBlbHNlIHRoaXMuX2V2ZW50c1tldnRdID0gW1xuICAgICAgdGhpcy5fZXZlbnRzW2V2dF0sIGxpc3RlbmVyXG4gICAgXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgZXZlbnQgd2Ugd2FudCB0byByZW1vdmUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgbGlzdGVuZXIgdGhhdCB3ZSBuZWVkIHRvIGZpbmQuXG4gKiBAcGFyYW0ge01peGVkfSBjb250ZXh0IE9ubHkgcmVtb3ZlIGxpc3RlbmVycyBtYXRjaGluZyB0aGlzIGNvbnRleHQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9uY2UgT25seSByZW1vdmUgb25jZSBsaXN0ZW5lcnMuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGZuLCBjb250ZXh0LCBvbmNlKSB7XG4gIHZhciBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbZXZ0XSkgcmV0dXJuIHRoaXM7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1tldnRdXG4gICAgLCBldmVudHMgPSBbXTtcblxuICBpZiAoZm4pIHtcbiAgICBpZiAobGlzdGVuZXJzLmZuKSB7XG4gICAgICBpZiAoXG4gICAgICAgICAgIGxpc3RlbmVycy5mbiAhPT0gZm5cbiAgICAgICAgfHwgKG9uY2UgJiYgIWxpc3RlbmVycy5vbmNlKVxuICAgICAgICB8fCAoY29udGV4dCAmJiBsaXN0ZW5lcnMuY29udGV4dCAhPT0gY29udGV4dClcbiAgICAgICkge1xuICAgICAgICBldmVudHMucHVzaChsaXN0ZW5lcnMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgICBsaXN0ZW5lcnNbaV0uZm4gIT09IGZuXG4gICAgICAgICAgfHwgKG9uY2UgJiYgIWxpc3RlbmVyc1tpXS5vbmNlKVxuICAgICAgICAgIHx8IChjb250ZXh0ICYmIGxpc3RlbmVyc1tpXS5jb250ZXh0ICE9PSBjb250ZXh0KVxuICAgICAgICApIHtcbiAgICAgICAgICBldmVudHMucHVzaChsaXN0ZW5lcnNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy9cbiAgLy8gUmVzZXQgdGhlIGFycmF5LCBvciByZW1vdmUgaXQgY29tcGxldGVseSBpZiB3ZSBoYXZlIG5vIG1vcmUgbGlzdGVuZXJzLlxuICAvL1xuICBpZiAoZXZlbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuX2V2ZW50c1tldnRdID0gZXZlbnRzLmxlbmd0aCA9PT0gMSA/IGV2ZW50c1swXSA6IGV2ZW50cztcbiAgfSBlbHNlIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW2V2dF07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFsbCBsaXN0ZW5lcnMgb3Igb25seSB0aGUgbGlzdGVuZXJzIGZvciB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgZXZlbnQgd2FudCB0byByZW1vdmUgYWxsIGxpc3RlbmVycyBmb3IuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycyhldmVudCkge1xuICBpZiAoIXRoaXMuX2V2ZW50cykgcmV0dXJuIHRoaXM7XG5cbiAgaWYgKGV2ZW50KSBkZWxldGUgdGhpcy5fZXZlbnRzW3ByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnRdO1xuICBlbHNlIHRoaXMuX2V2ZW50cyA9IHByZWZpeCA/IHt9IDogT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vXG4vLyBBbGlhcyBtZXRob2RzIG5hbWVzIGJlY2F1c2UgcGVvcGxlIHJvbGwgbGlrZSB0aGF0LlxuLy9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lcjtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4vL1xuLy8gVGhpcyBmdW5jdGlvbiBkb2Vzbid0IGFwcGx5IGFueW1vcmUuXG4vL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbiBzZXRNYXhMaXN0ZW5lcnMoKSB7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIEV4cG9zZSB0aGUgcHJlZml4LlxuLy9cbkV2ZW50RW1pdHRlci5wcmVmaXhlZCA9IHByZWZpeDtcblxuLy9cbi8vIEV4cG9zZSB0aGUgbW9kdWxlLlxuLy9cbmlmICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIG1vZHVsZSkge1xuICBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcbn1cbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG52YXIgTWVzc2FnZSA9IHJlcXVpcmUoJy4uL21lc3NhZ2UnKTtcblxuLyoqXG4gKiBTZW5kcyBldmVudHMgdG8gdGhlIGVtYmVkZGVkIFZSIHZpZXcgSUZyYW1lIHZpYSBwb3N0TWVzc2FnZS4gQWxzbyBoYW5kbGVzXG4gKiBtZXNzYWdlcyBzZW50IGJhY2sgZnJvbSB0aGUgSUZyYW1lOlxuICpcbiAqICAgIGNsaWNrOiBXaGVuIGEgaG90c3BvdCB3YXMgY2xpY2tlZC5cbiAqICAgIG1vZGVjaGFuZ2U6IFdoZW4gdGhlIHVzZXIgY2hhbmdlcyB2aWV3aW5nIG1vZGUgKFZSfEZ1bGxzY3JlZW58ZXRjKS5cbiAqL1xuZnVuY3Rpb24gSUZyYW1lTWVzc2FnZVNlbmRlcihpZnJhbWUpIHtcbiAgaWYgKCFpZnJhbWUpIHtcbiAgICBjb25zb2xlLmVycm9yKCdObyBpZnJhbWUgc3BlY2lmaWVkJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuaWZyYW1lID0gaWZyYW1lO1xuXG4gIC8vIE9uIGlPUywgaWYgdGhlIGlmcmFtZSBpcyBhY3Jvc3MgZG9tYWlucywgYWxzbyBzZW5kIERldmljZU1vdGlvbiBkYXRhLlxuICBpZiAodGhpcy5pc0lPU18oKSAmJiB0aGlzLmlzQ3Jvc3NEb21haW5JZnJhbWVfKCkpIHtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlbW90aW9uJywgdGhpcy5vbkRldmljZU1vdGlvbl8uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB9XG59XG5cbi8qKlxuICogU2VuZHMgYSBtZXNzYWdlIHRvIHRoZSBhc3NvY2lhdGVkIFZSIFZpZXcgSUZyYW1lLlxuICovXG5JRnJhbWVNZXNzYWdlU2VuZGVyLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgaWZyYW1lV2luZG93ID0gdGhpcy5pZnJhbWUuY29udGVudFdpbmRvdztcbiAgaWZyYW1lV2luZG93LnBvc3RNZXNzYWdlKG1lc3NhZ2UsICcqJyk7XG59O1xuXG5JRnJhbWVNZXNzYWdlU2VuZGVyLnByb3RvdHlwZS5vbkRldmljZU1vdGlvbl8gPSBmdW5jdGlvbihlKSB7XG4gIHZhciBtZXNzYWdlID0ge1xuICAgIHR5cGU6IE1lc3NhZ2UuREVWSUNFX01PVElPTixcbiAgICBkZXZpY2VNb3Rpb25FdmVudDogdGhpcy5jbG9uZURldmljZU1vdGlvbkV2ZW50XyhlKVxuICB9O1xuXG4gIHRoaXMuc2VuZChtZXNzYWdlKTtcbn07XG5cbklGcmFtZU1lc3NhZ2VTZW5kZXIucHJvdG90eXBlLmNsb25lRGV2aWNlTW90aW9uRXZlbnRfID0gZnVuY3Rpb24oZSkge1xuICByZXR1cm4ge1xuICAgIGFjY2VsZXJhdGlvbjoge1xuICAgICAgeDogZS5hY2NlbGVyYXRpb24ueCxcbiAgICAgIHk6IGUuYWNjZWxlcmF0aW9uLnksXG4gICAgICB6OiBlLmFjY2VsZXJhdGlvbi56LFxuICAgIH0sXG4gICAgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eToge1xuICAgICAgeDogZS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LngsXG4gICAgICB5OiBlLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkueSxcbiAgICAgIHo6IGUuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS56LFxuICAgIH0sXG4gICAgcm90YXRpb25SYXRlOiB7XG4gICAgICBhbHBoYTogZS5yb3RhdGlvblJhdGUuYWxwaGEsXG4gICAgICBiZXRhOiBlLnJvdGF0aW9uUmF0ZS5iZXRhLFxuICAgICAgZ2FtbWE6IGUucm90YXRpb25SYXRlLmdhbW1hLFxuICAgIH0sXG4gICAgaW50ZXJ2YWw6IGUuaW50ZXJ2YWxcbiAgfTtcbn07XG5cbklGcmFtZU1lc3NhZ2VTZW5kZXIucHJvdG90eXBlLmlzSU9TXyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gL2lQYWR8aVBob25lfGlQb2QvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkgJiYgIXdpbmRvdy5NU1N0cmVhbTtcbn07XG5cbi8vIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMjM4MTMzNC9mb29scHJvb2Ytd2F5LXRvLWRldGVjdC1pZi1pZnJhbWUtaXMtY3Jvc3MtZG9tYWluLlxuSUZyYW1lTWVzc2FnZVNlbmRlci5wcm90b3R5cGUuaXNDcm9zc0RvbWFpbklmcmFtZV8gPSBmdW5jdGlvbihpZnJhbWUpIHtcbiAgdmFyIGh0bWwgPSBudWxsO1xuICB0cnkgeyBcbiAgICB2YXIgZG9jID0gaWZyYW1lLmNvbnRlbnREb2N1bWVudCB8fCBpZnJhbWUuY29udGVudFdpbmRvdy5kb2N1bWVudDtcbiAgICBodG1sID0gZG9jLmJvZHkuaW5uZXJIVE1MO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgfVxuXG4gIHJldHVybiAoaHRtbCA9PT0gbnVsbCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IElGcmFtZU1lc3NhZ2VTZW5kZXI7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG52YXIgUGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcblxudmFyIFZSVmlldyA9IHtcbiAgUGxheWVyOiBQbGF5ZXJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVlJWaWV3O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjMnKTtcbnZhciBJRnJhbWVNZXNzYWdlU2VuZGVyID0gcmVxdWlyZSgnLi9pZnJhbWUtbWVzc2FnZS1zZW5kZXInKTtcbnZhciBNZXNzYWdlID0gcmVxdWlyZSgnLi4vbWVzc2FnZScpO1xudmFyIFV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbi8vIFNhdmUgdGhlIGV4ZWN1dGluZyBzY3JpcHQuIFRoaXMgd2lsbCBiZSB1c2VkIHRvIGNhbGN1bGF0ZSB0aGUgZW1iZWQgVVJMLlxudmFyIENVUlJFTlRfU0NSSVBUX1NSQyA9IFV0aWwuZ2V0Q3VycmVudFNjcmlwdCgpLnNyYztcbnZhciBGQUtFX0ZVTExTQ1JFRU5fQ0xBU1MgPSAndnJ2aWV3LWZha2UtZnVsbHNjcmVlbic7XG5cbi8qKlxuICogRW50cnkgcG9pbnQgZm9yIHRoZSBWUiBWaWV3IEpTIEFQSS5cbiAqXG4gKiBFbWl0cyB0aGUgZm9sbG93aW5nIGV2ZW50czpcbiAqICAgIHJlYWR5OiBXaGVuIHRoZSBwbGF5ZXIgaXMgbG9hZGVkLlxuICogICAgbW9kZWNoYW5nZTogV2hlbiB0aGUgdmlld2luZyBtb2RlIGNoYW5nZXMgKG5vcm1hbCwgZnVsbHNjcmVlbiwgVlIpLlxuICogICAgY2xpY2sgKGlkKTogV2hlbiBhIGhvdHNwb3QgaXMgY2xpY2tlZC5cbiAqL1xuZnVuY3Rpb24gUGxheWVyKHNlbGVjdG9yLCBjb250ZW50SW5mbykge1xuICAvLyBDcmVhdGUgYSBWUiBWaWV3IGlmcmFtZSBkZXBlbmRpbmcgb24gdGhlIHBhcmFtZXRlcnMuXG4gIHZhciBpZnJhbWUgPSB0aGlzLmNyZWF0ZUlmcmFtZV8oY29udGVudEluZm8pO1xuICB0aGlzLmlmcmFtZSA9IGlmcmFtZTtcblxuICB2YXIgcGFyZW50RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgcGFyZW50RWwuYXBwZW5kQ2hpbGQoaWZyYW1lKTtcblxuICAvLyBNYWtlIGEgc2VuZGVyIGFzIHdlbGwsIGZvciByZWx5aW5nIGNvbW1hbmRzIHRvIHRoZSBjaGlsZCBJRnJhbWUuXG4gIHRoaXMuc2VuZGVyID0gbmV3IElGcmFtZU1lc3NhZ2VTZW5kZXIoaWZyYW1lKTtcblxuICAvLyBMaXN0ZW4gdG8gbWVzc2FnZXMgZnJvbSB0aGUgSUZyYW1lLlxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHRoaXMub25NZXNzYWdlXy5iaW5kKHRoaXMpLCBmYWxzZSk7XG5cbiAgLy8gRXhwb3NlIGEgcHVibGljIC5pc1BhdXNlZCBhdHRyaWJ1dGUuXG4gIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcblxuICBpZiAoVXRpbC5pc0lPUygpKSB7XG4gICAgdGhpcy5pbmplY3RGdWxsc2NyZWVuU3R5bGVzaGVldF8oKTtcbiAgfVxufVxuUGxheWVyLnByb3RvdHlwZSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuLyoqXG4gKiBAcGFyYW0gcGl0Y2gge051bWJlcn0gVGhlIGxhdGl0dWRlIG9mIGNlbnRlciwgc3BlY2lmaWVkIGluIGRlZ3JlZXMsIGJldHdlZW5cbiAqIC05MCBhbmQgOTAsIHdpdGggMCBhdCB0aGUgaG9yaXpvbi5cbiAqIEBwYXJhbSB5YXcge051bWJlcn0gVGhlIGxvbmdpdHVkZSBvZiBjZW50ZXIsIHNwZWNpZmllZCBpbiBkZWdyZWVzLCBiZXR3ZWVuXG4gKiAtMTgwIGFuZCAxODAsIHdpdGggMCBhdCB0aGUgaW1hZ2UgY2VudGVyLlxuICogQHBhcmFtIHJhZGl1cyB7TnVtYmVyfSBUaGUgcmFkaXVzIG9mIHRoZSBob3RzcG90LCBzcGVjaWZpZWQgaW4gbWV0ZXJzLlxuICogQHBhcmFtIGRpc3RhbmNlIHtOdW1iZXJ9IFRoZSBkaXN0YW5jZSBvZiB0aGUgaG90c3BvdCBmcm9tIGNhbWVyYSwgc3BlY2lmaWVkXG4gKiBpbiBtZXRlcnMuXG4gKiBAcGFyYW0gaG90c3BvdElkIHtTdHJpbmd9IFRoZSBJRCBvZiB0aGUgaG90c3BvdC5cbiAqL1xuUGxheWVyLnByb3RvdHlwZS5hZGRIb3RzcG90ID0gZnVuY3Rpb24oaG90c3BvdElkLCBwYXJhbXMpIHtcbiAgLy8gVE9ETzogQWRkIHZhbGlkYXRpb24gdG8gcGFyYW1zLlxuICB2YXIgZGF0YSA9IHtcbiAgICBwaXRjaDogcGFyYW1zLnBpdGNoLFxuICAgIHlhdzogcGFyYW1zLnlhdyxcbiAgICByYWRpdXM6IHBhcmFtcy5yYWRpdXMsXG4gICAgZGlzdGFuY2U6IHBhcmFtcy5kaXN0YW5jZSxcbiAgICBpZDogaG90c3BvdElkXG4gIH07XG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuQUREX0hPVFNQT1QsIGRhdGE6IGRhdGF9KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLlBMQVl9KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5QQVVTRX0pO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24oY29udGVudEluZm8pIHtcbiAgdGhpcy5hYnNvbHV0aWZ5UGF0aHNfKGNvbnRlbnRJbmZvKTtcbiAgdmFyIGRhdGEgPSB7XG4gICAgY29udGVudEluZm86IGNvbnRlbnRJbmZvXG4gIH07XG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuU0VUX0NPTlRFTlQsIGRhdGE6IGRhdGF9KTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgc29mdHdhcmUgdm9sdW1lIG9mIHRoZSB2aWRlby4gMCBpcyBtdXRlLCAxIGlzIG1heC5cbiAqL1xuUGxheWVyLnByb3RvdHlwZS5zZXRWb2x1bWUgPSBmdW5jdGlvbih2b2x1bWVMZXZlbCkge1xuICB2YXIgZGF0YSA9IHtcbiAgICB2b2x1bWVMZXZlbDogdm9sdW1lTGV2ZWxcbiAgfTtcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5TRVRfVk9MVU1FLCBkYXRhOiBkYXRhfSk7XG59O1xuXG4vKipcbiAqIEhlbHBlciBmb3IgY3JlYXRpbmcgYW4gaWZyYW1lLlxuICpcbiAqIEByZXR1cm4ge0lGcmFtZUVsZW1lbnR9IFRoZSBpZnJhbWUuXG4gKi9cblBsYXllci5wcm90b3R5cGUuY3JlYXRlSWZyYW1lXyA9IGZ1bmN0aW9uKGNvbnRlbnRJbmZvKSB7XG4gIHRoaXMuYWJzb2x1dGlmeVBhdGhzXyhjb250ZW50SW5mbyk7XG5cbiAgdmFyIGlmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICBpZnJhbWUuc2V0QXR0cmlidXRlKCdhbGxvd2Z1bGxzY3JlZW4nLCB0cnVlKTtcbiAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnc2Nyb2xsaW5nJywgJ25vJyk7XG4gIGlmcmFtZS5zdHlsZS5ib3JkZXIgPSAwO1xuXG4gIC8vIEhhbmRsZSBpZnJhbWUgc2l6ZSBpZiB3aWR0aCBhbmQgaGVpZ2h0IGFyZSBzcGVjaWZpZWQuXG4gIGlmIChjb250ZW50SW5mby5oYXNPd25Qcm9wZXJ0eSgnd2lkdGgnKSkge1xuICAgIGlmcmFtZS5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgY29udGVudEluZm8ud2lkdGgpO1xuICAgIGRlbGV0ZSBjb250ZW50SW5mby53aWR0aDtcbiAgfVxuICBpZiAoY29udGVudEluZm8uaGFzT3duUHJvcGVydHkoJ2hlaWdodCcpKSB7XG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgY29udGVudEluZm8uaGVpZ2h0KTtcbiAgICBkZWxldGUgY29udGVudEluZm8uaGVpZ2h0O1xuICB9XG5cbiAgdmFyIHVybCA9IHRoaXMuZ2V0RW1iZWRVcmxfKCkgKyBVdGlsLmNyZWF0ZUdldFBhcmFtcyhjb250ZW50SW5mbyk7XG4gIGlmcmFtZS5zcmMgPSB1cmw7XG5cbiAgcmV0dXJuIGlmcmFtZTtcbn07XG5cblBsYXllci5wcm90b3R5cGUub25NZXNzYWdlXyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBtZXNzYWdlID0gZXZlbnQuZGF0YTtcbiAgdmFyIHR5cGUgPSBtZXNzYWdlLnR5cGUudG9Mb3dlckNhc2UoKTtcbiAgdmFyIGRhdGEgPSBtZXNzYWdlLmRhdGE7XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAncmVhZHknOlxuICAgIGNhc2UgJ21vZGVjaGFuZ2UnOlxuICAgIGNhc2UgJ2Vycm9yJzpcbiAgICBjYXNlICdjbGljayc6XG4gICAgICB0aGlzLmVtaXQodHlwZSwgZGF0YSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdwYXVzZWQnOlxuICAgICAgdGhpcy5pc1BhdXNlZCA9IGRhdGE7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdlbnRlci1mdWxsc2NyZWVuJzpcbiAgICBjYXNlICdlbnRlci12cic6XG4gICAgICB0aGlzLnNldEZha2VGdWxsc2NyZWVuXyh0cnVlKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2V4aXQtZnVsbHNjcmVlbic6XG4gICAgICB0aGlzLnNldEZha2VGdWxsc2NyZWVuXyhmYWxzZSk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS53YXJuKCdHb3QgdW5rbm93biBtZXNzYWdlIG9mIHR5cGUgJXMgZnJvbSAlcycsIG1lc3NhZ2UudHlwZSwgbWVzc2FnZS5vcmlnaW4pO1xuICB9XG59O1xuXG4vKipcbiAqIE5vdGU6IGlPUyBkb2Vzbid0IHN1cHBvcnQgdGhlIGZ1bGxzY3JlZW4gQVBJLlxuICogSW4gc3RhbmRhbG9uZSA8aWZyYW1lPiBtb2RlLCBWUiBWaWV3IGVtdWxhdGVzIGZ1bGxzY3JlZW4gYnkgcmVkaXJlY3RpbmcgdG9cbiAqIGFub3RoZXIgcGFnZS5cbiAqIEluIEpTIEFQSSBtb2RlLCB3ZSBzdHJldGNoIHRoZSBpZnJhbWUgdG8gY292ZXIgdGhlIGV4dGVudCBvZiB0aGUgcGFnZSB1c2luZ1xuICogQ1NTLiBUbyBkbyB0aGlzIGNsZWFubHksIHdlIGFsc28gaW5qZWN0IGEgc3R5bGVzaGVldC5cbiAqL1xuUGxheWVyLnByb3RvdHlwZS5zZXRGYWtlRnVsbHNjcmVlbl8gPSBmdW5jdGlvbihpc0Z1bGxzY3JlZW4pIHtcbiAgaWYgKGlzRnVsbHNjcmVlbikge1xuICAgIHRoaXMuaWZyYW1lLmNsYXNzTGlzdC5hZGQoRkFLRV9GVUxMU0NSRUVOX0NMQVNTKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmlmcmFtZS5jbGFzc0xpc3QucmVtb3ZlKEZBS0VfRlVMTFNDUkVFTl9DTEFTUyk7XG4gIH1cbn07XG5cblBsYXllci5wcm90b3R5cGUuaW5qZWN0RnVsbHNjcmVlblN0eWxlc2hlZXRfID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzdHlsZVN0cmluZyA9IFtcbiAgICAnaWZyYW1lLicgKyBGQUtFX0ZVTExTQ1JFRU5fQ0xBU1MsXG4gICAgJ3snLFxuICAgICAgJ3Bvc2l0aW9uOiBmaXhlZCAhaW1wb3J0YW50OycsXG4gICAgICAnZGlzcGxheTogYmxvY2sgIWltcG9ydGFudDsnLFxuICAgICAgJ3otaW5kZXg6IDk5OTk5OTk5OTkgIWltcG9ydGFudDsnLFxuICAgICAgJ3RvcDogMCAhaW1wb3J0YW50OycsXG4gICAgICAnbGVmdDogMCAhaW1wb3J0YW50OycsXG4gICAgICAnd2lkdGg6IDEwMCUgIWltcG9ydGFudDsnLFxuICAgICAgJ2hlaWdodDogMTAwJSAhaW1wb3J0YW50OycsXG4gICAgICAnbWFyZ2luOiAwICFpbXBvcnRhbnQ7JyxcbiAgICAnfScsXG4gIF0uam9pbignXFxuJyk7XG4gIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gIHN0eWxlLmlubmVySFRNTCA9IHN0eWxlU3RyaW5nO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHN0eWxlKTtcbn07XG5cblBsYXllci5wcm90b3R5cGUuZ2V0RW1iZWRVcmxfID0gZnVuY3Rpb24oKSB7XG4gIC8vIEFzc3VtZSB0aGF0IHRoZSBzY3JpcHQgaXMgaW4gJFJPT1QvYnVpbGQvc29tZXRoaW5nLmpzLCBhbmQgdGhhdCB0aGUgaWZyYW1lXG4gIC8vIEhUTUwgaXMgaW4gJFJPT1QvaW5kZXguaHRtbC5cbiAgLy9cbiAgLy8gRS5nOiAvdnJ2aWV3LzIuMC9idWlsZC92cnZpZXcubWluLmpzID0+IC92cnZpZXcvMi4wL2luZGV4Lmh0bWwuXG4gIHZhciBwYXRoID0gQ1VSUkVOVF9TQ1JJUFRfU1JDO1xuICB2YXIgc3BsaXQgPSBwYXRoLnNwbGl0KCcvJyk7XG4gIHZhciByb290U3BsaXQgPSBzcGxpdC5zbGljZSgwLCBzcGxpdC5sZW5ndGggLSAyKTtcbiAgdmFyIHJvb3RQYXRoID0gcm9vdFNwbGl0LmpvaW4oJy8nKTtcbiAgcmV0dXJuIHJvb3RQYXRoICsgJy9pbmRleC5odG1sJztcbn07XG5cblBsYXllci5wcm90b3R5cGUuZ2V0RGlyTmFtZV8gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhdGggPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWU7XG4gIHBhdGggPSBwYXRoLnN1YnN0cmluZygwLCBwYXRoLmxhc3RJbmRleE9mKCcvJykpO1xuICByZXR1cm4gbG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgbG9jYXRpb24uaG9zdCArIHBhdGg7XG59O1xuXG4vKipcbiAqIE1ha2UgYWxsIG9mIHRoZSBVUkxzIGluc2lkZSBjb250ZW50SW5mbyBhYnNvbHV0ZSBpbnN0ZWFkIG9mIHJlbGF0aXZlLlxuICovXG5QbGF5ZXIucHJvdG90eXBlLmFic29sdXRpZnlQYXRoc18gPSBmdW5jdGlvbihjb250ZW50SW5mbykge1xuICB2YXIgZGlyTmFtZSA9IHRoaXMuZ2V0RGlyTmFtZV8oKTtcbiAgdmFyIHVybFBhcmFtcyA9IFsnaW1hZ2UnLCAncHJldmlldycsICd2aWRlbyddO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdXJsUGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG5hbWUgPSB1cmxQYXJhbXNbaV07XG4gICAgdmFyIHBhdGggPSBjb250ZW50SW5mb1tuYW1lXTtcbiAgICBpZiAocGF0aCAmJiBVdGlsLmlzUGF0aEFic29sdXRlKHBhdGgpKSB7XG4gICAgICB2YXIgYWJzb2x1dGUgPSBVdGlsLnJlbGF0aXZlVG9BYnNvbHV0ZVBhdGgoZGlyTmFtZSwgcGF0aCk7XG4gICAgICBjb250ZW50SW5mb1tuYW1lXSA9IGFic29sdXRlO1xuICAgICAgLy9jb25zb2xlLmxvZygnQ29udmVydGVkIHRvIGFic29sdXRlOiAlcycsIGFic29sdXRlKTtcbiAgICB9XG4gIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXI7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG4vKipcbiAqIE1lc3NhZ2VzIGZyb20gdGhlIEFQSSB0byB0aGUgZW1iZWQuXG4gKi9cbnZhciBNZXNzYWdlID0ge1xuICBQTEFZOiAncGxheScsXG4gIFBBVVNFOiAncGF1c2UnLFxuICBBRERfSE9UU1BPVDogJ2FkZGhvdHNwb3QnLFxuICBTRVRfQ09OVEVOVDogJ3NldGltYWdlJyxcbiAgU0VUX1ZPTFVNRTogJ3NldHZvbHVtZScsXG4gIERFVklDRV9NT1RJT046ICdkZXZpY2Vtb3Rpb24nLFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuVXRpbCA9IHdpbmRvdy5VdGlsIHx8IHt9O1xuXG5VdGlsLmlzRGF0YVVSSSA9IGZ1bmN0aW9uKHNyYykge1xuICByZXR1cm4gc3JjICYmIHNyYy5pbmRleE9mKCdkYXRhOicpID09IDA7XG59O1xuXG5VdGlsLmdlbmVyYXRlVVVJRCA9IGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiBzNCgpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcbiAgICAudG9TdHJpbmcoMTYpXG4gICAgLnN1YnN0cmluZygxKTtcbiAgfVxuICByZXR1cm4gczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArXG4gICAgczQoKSArICctJyArIHM0KCkgKyBzNCgpICsgczQoKTtcbn07XG5cblV0aWwuaXNNb2JpbGUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNoZWNrID0gZmFsc2U7XG4gIChmdW5jdGlvbihhKXtpZigvKGFuZHJvaWR8YmJcXGQrfG1lZWdvKS4rbW9iaWxlfGF2YW50Z298YmFkYVxcL3xibGFja2JlcnJ5fGJsYXplcnxjb21wYWx8ZWxhaW5lfGZlbm5lY3xoaXB0b3B8aWVtb2JpbGV8aXAoaG9uZXxvZCl8aXJpc3xraW5kbGV8bGdlIHxtYWVtb3xtaWRwfG1tcHxtb2JpbGUuK2ZpcmVmb3h8bmV0ZnJvbnR8b3BlcmEgbShvYnxpbilpfHBhbG0oIG9zKT98cGhvbmV8cChpeGl8cmUpXFwvfHBsdWNrZXJ8cG9ja2V0fHBzcHxzZXJpZXMoNHw2KTB8c3ltYmlhbnx0cmVvfHVwXFwuKGJyb3dzZXJ8bGluayl8dm9kYWZvbmV8d2FwfHdpbmRvd3MgY2V8eGRhfHhpaW5vL2kudGVzdChhKXx8LzEyMDd8NjMxMHw2NTkwfDNnc298NHRocHw1MFsxLTZdaXw3NzBzfDgwMnN8YSB3YXxhYmFjfGFjKGVyfG9vfHNcXC0pfGFpKGtvfHJuKXxhbChhdnxjYXxjbyl8YW1vaXxhbihleHxueXx5dyl8YXB0dXxhcihjaHxnbyl8YXModGV8dXMpfGF0dHd8YXUoZGl8XFwtbXxyIHxzICl8YXZhbnxiZShja3xsbHxucSl8YmkobGJ8cmQpfGJsKGFjfGF6KXxicihlfHYpd3xidW1ifGJ3XFwtKG58dSl8YzU1XFwvfGNhcGl8Y2N3YXxjZG1cXC18Y2VsbHxjaHRtfGNsZGN8Y21kXFwtfGNvKG1wfG5kKXxjcmF3fGRhKGl0fGxsfG5nKXxkYnRlfGRjXFwtc3xkZXZpfGRpY2F8ZG1vYnxkbyhjfHApb3xkcygxMnxcXC1kKXxlbCg0OXxhaSl8ZW0obDJ8dWwpfGVyKGljfGswKXxlc2w4fGV6KFs0LTddMHxvc3x3YXx6ZSl8ZmV0Y3xmbHkoXFwtfF8pfGcxIHV8ZzU2MHxnZW5lfGdmXFwtNXxnXFwtbW98Z28oXFwud3xvZCl8Z3IoYWR8dW4pfGhhaWV8aGNpdHxoZFxcLShtfHB8dCl8aGVpXFwtfGhpKHB0fHRhKXxocCggaXxpcCl8aHNcXC1jfGh0KGMoXFwtfCB8X3xhfGd8cHxzfHQpfHRwKXxodShhd3x0Yyl8aVxcLSgyMHxnb3xtYSl8aTIzMHxpYWMoIHxcXC18XFwvKXxpYnJvfGlkZWF8aWcwMXxpa29tfGltMWt8aW5ub3xpcGFxfGlyaXN8amEodHx2KWF8amJyb3xqZW11fGppZ3N8a2RkaXxrZWppfGtndCggfFxcLyl8a2xvbnxrcHQgfGt3Y1xcLXxreW8oY3xrKXxsZShub3x4aSl8bGcoIGd8XFwvKGt8bHx1KXw1MHw1NHxcXC1bYS13XSl8bGlid3xseW54fG0xXFwtd3xtM2dhfG01MFxcL3xtYSh0ZXx1aXx4byl8bWMoMDF8MjF8Y2EpfG1cXC1jcnxtZShyY3xyaSl8bWkobzh8b2F8dHMpfG1tZWZ8bW8oMDF8MDJ8Yml8ZGV8ZG98dChcXC18IHxvfHYpfHp6KXxtdCg1MHxwMXx2ICl8bXdicHxteXdhfG4xMFswLTJdfG4yMFsyLTNdfG4zMCgwfDIpfG41MCgwfDJ8NSl8bjcoMCgwfDEpfDEwKXxuZSgoY3xtKVxcLXxvbnx0Znx3Znx3Z3x3dCl8bm9rKDZ8aSl8bnpwaHxvMmltfG9wKHRpfHd2KXxvcmFufG93ZzF8cDgwMHxwYW4oYXxkfHQpfHBkeGd8cGcoMTN8XFwtKFsxLThdfGMpKXxwaGlsfHBpcmV8cGwoYXl8dWMpfHBuXFwtMnxwbyhja3xydHxzZSl8cHJveHxwc2lvfHB0XFwtZ3xxYVxcLWF8cWMoMDd8MTJ8MjF8MzJ8NjB8XFwtWzItN118aVxcLSl8cXRla3xyMzgwfHI2MDB8cmFrc3xyaW05fHJvKHZlfHpvKXxzNTVcXC98c2EoZ2V8bWF8bW18bXN8bnl8dmEpfHNjKDAxfGhcXC18b298cFxcLSl8c2RrXFwvfHNlKGMoXFwtfDB8MSl8NDd8bWN8bmR8cmkpfHNnaFxcLXxzaGFyfHNpZShcXC18bSl8c2tcXC0wfHNsKDQ1fGlkKXxzbShhbHxhcnxiM3xpdHx0NSl8c28oZnR8bnkpfHNwKDAxfGhcXC18dlxcLXx2ICl8c3koMDF8bWIpfHQyKDE4fDUwKXx0NigwMHwxMHwxOCl8dGEoZ3R8bGspfHRjbFxcLXx0ZGdcXC18dGVsKGl8bSl8dGltXFwtfHRcXC1tb3x0byhwbHxzaCl8dHMoNzB8bVxcLXxtM3xtNSl8dHhcXC05fHVwKFxcLmJ8ZzF8c2kpfHV0c3R8djQwMHx2NzUwfHZlcml8dmkocmd8dGUpfHZrKDQwfDVbMC0zXXxcXC12KXx2bTQwfHZvZGF8dnVsY3x2eCg1Mnw1M3w2MHw2MXw3MHw4MHw4MXw4M3w4NXw5OCl8dzNjKFxcLXwgKXx3ZWJjfHdoaXR8d2koZyB8bmN8bncpfHdtbGJ8d29udXx4NzAwfHlhc1xcLXx5b3VyfHpldG98enRlXFwtL2kudGVzdChhLnN1YnN0cigwLDQpKSljaGVjayA9IHRydWV9KShuYXZpZ2F0b3IudXNlckFnZW50fHxuYXZpZ2F0b3IudmVuZG9yfHx3aW5kb3cub3BlcmEpO1xuICByZXR1cm4gY2hlY2s7XG59O1xuXG5VdGlsLmlzSU9TID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAvKGlQYWR8aVBob25lfGlQb2QpL2cudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcbn07XG5cblV0aWwuaXNTYWZhcmkgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIC9eKCg/IWNocm9tZXxhbmRyb2lkKS4pKnNhZmFyaS9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG59O1xuXG5VdGlsLmNsb25lT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gIHZhciBvdXQgPSB7fTtcbiAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgb3V0W2tleV0gPSBvYmpba2V5XTtcbiAgfVxuICByZXR1cm4gb3V0O1xufTtcblxuVXRpbC5oYXNoQ29kZSA9IGZ1bmN0aW9uKHMpIHtcbiAgcmV0dXJuIHMuc3BsaXQoXCJcIikucmVkdWNlKGZ1bmN0aW9uKGEsYil7YT0oKGE8PDUpLWEpK2IuY2hhckNvZGVBdCgwKTtyZXR1cm4gYSZhfSwwKTtcbn07XG5cblV0aWwubG9hZFRyYWNrU3JjID0gZnVuY3Rpb24oY29udGV4dCwgc3JjLCBjYWxsYmFjaywgb3B0X3Byb2dyZXNzQ2FsbGJhY2spIHtcbiAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgcmVxdWVzdC5vcGVuKCdHRVQnLCBzcmMsIHRydWUpO1xuICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cbiAgLy8gRGVjb2RlIGFzeW5jaHJvbm91c2x5LlxuICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcXVlc3QucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgY2FsbGJhY2soYnVmZmVyKTtcbiAgICB9LCBmdW5jdGlvbihlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgIH0pO1xuICB9O1xuICBpZiAob3B0X3Byb2dyZXNzQ2FsbGJhY2spIHtcbiAgICByZXF1ZXN0Lm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgcGVyY2VudCA9IGUubG9hZGVkIC8gZS50b3RhbDtcbiAgICAgIG9wdF9wcm9ncmVzc0NhbGxiYWNrKHBlcmNlbnQpO1xuICAgIH07XG4gIH1cbiAgcmVxdWVzdC5zZW5kKCk7XG59O1xuXG5VdGlsLmlzUG93MiA9IGZ1bmN0aW9uKG4pIHtcbiAgcmV0dXJuIChuICYgKG4gLSAxKSkgPT0gMDtcbn07XG5cblV0aWwuY2FwaXRhbGl6ZSA9IGZ1bmN0aW9uKHMpIHtcbiAgcmV0dXJuIHMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpO1xufTtcblxuVXRpbC5pc0lGcmFtZSA9IGZ1bmN0aW9uKCkge1xuICB0cnkge1xuICAgIHJldHVybiB3aW5kb3cuc2VsZiAhPT0gd2luZG93LnRvcDtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59O1xuXG4vLyBGcm9tIGh0dHA6Ly9nb28uZ2wvNFdYM3RnXG5VdGlsLmdldFF1ZXJ5UGFyYW1ldGVyID0gZnVuY3Rpb24obmFtZSkge1xuICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpO1xuICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFwiW1xcXFw/Jl1cIiArIG5hbWUgKyBcIj0oW14mI10qKVwiKSxcbiAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaCk7XG4gIHJldHVybiByZXN1bHRzID09PSBudWxsID8gXCJcIiA6IGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpO1xufTtcblxuXG4vLyBGcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTE4NzEwNzcvcHJvcGVyLXdheS10by1kZXRlY3Qtd2ViZ2wtc3VwcG9ydC5cblV0aWwuaXNXZWJHTEVuYWJsZWQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICB0cnkgeyBnbCA9IGNhbnZhcy5nZXRDb250ZXh0KFwid2ViZ2xcIik7IH1cbiAgY2F0Y2ggKHgpIHsgZ2wgPSBudWxsOyB9XG5cbiAgaWYgKGdsID09IG51bGwpIHtcbiAgICB0cnkgeyBnbCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiZXhwZXJpbWVudGFsLXdlYmdsXCIpOyBleHBlcmltZW50YWwgPSB0cnVlOyB9XG4gICAgY2F0Y2ggKHgpIHsgZ2wgPSBudWxsOyB9XG4gIH1cbiAgcmV0dXJuICEhZ2w7XG59O1xuXG5VdGlsLmNsb25lID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9iaikpO1xufTtcblxuLy8gRnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwMTQwNjA0L2Zhc3Rlc3QtaHlwb3RlbnVzZS1pbi1qYXZhc2NyaXB0XG5VdGlsLmh5cG90ID0gTWF0aC5oeXBvdCB8fCBmdW5jdGlvbih4LCB5KSB7XG4gIHJldHVybiBNYXRoLnNxcnQoeCp4ICsgeSp5KTtcbn07XG5cbi8vIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTc0NDc3MTgvNjkzOTM0XG5VdGlsLmlzSUUxMSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvVHJpZGVudC8pO1xufTtcblxuVXRpbC5nZXRSZWN0Q2VudGVyID0gZnVuY3Rpb24ocmVjdCkge1xuICByZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjIocmVjdC54ICsgcmVjdC53aWR0aC8yLCByZWN0LnkgKyByZWN0LmhlaWdodC8yKTtcbn07XG5cblV0aWwuZ2V0U2NyZWVuV2lkdGggPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE1hdGgubWF4KHdpbmRvdy5zY3JlZW4ud2lkdGgsIHdpbmRvdy5zY3JlZW4uaGVpZ2h0KSAqXG4gICAgICB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbn07XG5cblV0aWwuZ2V0U2NyZWVuSGVpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBNYXRoLm1pbih3aW5kb3cuc2NyZWVuLndpZHRoLCB3aW5kb3cuc2NyZWVuLmhlaWdodCkgKlxuICAgICAgd2luZG93LmRldmljZVBpeGVsUmF0aW87XG59O1xuXG5VdGlsLmlzSU9TOU9yTGVzcyA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIVV0aWwuaXNJT1MoKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YXIgcmUgPSAvKGlQaG9uZXxpUGFkfGlQb2QpIE9TIChbXFxkX10rKS87XG4gIHZhciBpT1NWZXJzaW9uID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaChyZSk7XG4gIGlmICghaU9TVmVyc2lvbikge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvLyBHZXQgdGhlIGxhc3QgZ3JvdXAuXG4gIHZhciB2ZXJzaW9uU3RyaW5nID0gaU9TVmVyc2lvbltpT1NWZXJzaW9uLmxlbmd0aCAtIDFdO1xuICB2YXIgbWFqb3JWZXJzaW9uID0gcGFyc2VGbG9hdCh2ZXJzaW9uU3RyaW5nKTtcbiAgcmV0dXJuIG1ham9yVmVyc2lvbiA8PSA5O1xufTtcblxuVXRpbC5nZXRFeHRlbnNpb24gPSBmdW5jdGlvbih1cmwpIHtcbiAgcmV0dXJuIHVybC5zcGxpdCgnLicpLnBvcCgpO1xufTtcblxuVXRpbC5jcmVhdGVHZXRQYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgdmFyIG91dCA9ICc/JztcbiAgZm9yICh2YXIgayBpbiBwYXJhbXMpIHtcbiAgICB2YXIgcGFyYW1TdHJpbmcgPSBrICsgJz0nICsgcGFyYW1zW2tdICsgJyYnO1xuICAgIG91dCArPSBwYXJhbVN0cmluZztcbiAgfVxuICAvLyBSZW1vdmUgdGhlIHRyYWlsaW5nIGFtcGVyc2FuZC5cbiAgb3V0LnN1YnN0cmluZygwLCBwYXJhbXMubGVuZ3RoIC0gMik7XG4gIHJldHVybiBvdXQ7XG59O1xuXG5VdGlsLnNlbmRQYXJlbnRNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICBpZiAod2luZG93LnBhcmVudCkge1xuICAgIHBhcmVudC5wb3N0TWVzc2FnZShtZXNzYWdlLCAnKicpO1xuICB9XG59O1xuXG5VdGlsLnBhcnNlQm9vbGVhbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PSAnZmFsc2UnIHx8IHZhbHVlID09IDApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSBpZiAodmFsdWUgPT0gJ3RydWUnIHx8IHZhbHVlID09IDEpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gISF2YWx1ZTtcbiAgfVxufTtcblxuLyoqXG4gKiBAcGFyYW0gYmFzZSB7U3RyaW5nfSBBbiBhYnNvbHV0ZSBkaXJlY3Rvcnkgcm9vdC5cbiAqIEBwYXJhbSByZWxhdGl2ZSB7U3RyaW5nfSBBIHJlbGF0aXZlIHBhdGguXG4gKlxuICogQHJldHVybnMge1N0cmluZ30gQW4gYWJzb2x1dGUgcGF0aCBjb3JyZXNwb25kaW5nIHRvIHRoZSByb290UGF0aC5cbiAqXG4gKiBGcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzE0NzgwNDYzLzY5MzkzNC5cbiAqL1xuVXRpbC5yZWxhdGl2ZVRvQWJzb2x1dGVQYXRoID0gZnVuY3Rpb24oYmFzZSwgcmVsYXRpdmUpIHtcbiAgdmFyIHN0YWNrID0gYmFzZS5zcGxpdCgnLycpO1xuICB2YXIgcGFydHMgPSByZWxhdGl2ZS5zcGxpdCgnLycpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHBhcnRzW2ldID09ICcuJykge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChwYXJ0c1tpXSA9PSAnLi4nKSB7XG4gICAgICBzdGFjay5wb3AoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhY2sucHVzaChwYXJ0c1tpXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdGFjay5qb2luKCcvJyk7XG59O1xuXG4vKipcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWZmIHRoZSBzcGVjaWZpZWQgcGF0aCBpcyBhbiBhYnNvbHV0ZSBwYXRoLlxuICovXG5VdGlsLmlzUGF0aEFic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gISAvXig/OlxcL3xbYS16XSs6XFwvXFwvKS8udGVzdChwYXRoKTtcbn1cblxuVXRpbC5pc0VtcHR5T2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopLmxlbmd0aCA9PSAwO1xufTtcblxuVXRpbC5pc0RlYnVnID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBVdGlsLnBhcnNlQm9vbGVhbihVdGlsLmdldFF1ZXJ5UGFyYW1ldGVyKCdkZWJ1ZycpKTtcbn07XG5cblV0aWwuZ2V0Q3VycmVudFNjcmlwdCA9IGZ1bmN0aW9uKCkge1xuICAvLyBOb3RlOiBpbiBJRTExLCBkb2N1bWVudC5jdXJyZW50U2NyaXB0IGRvZXNuJ3Qgd29yaywgc28gd2UgZmFsbCBiYWNrIHRvIHRoaXNcbiAgLy8gaGFjaywgdGFrZW4gZnJvbSBodHRwczovL2dvby5nbC9UcEV4dUguXG4gIGlmICghZG9jdW1lbnQuY3VycmVudFNjcmlwdCkge1xuICAgIGNvbnNvbGUud2FybignVGhpcyBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgZG9jdW1lbnQuY3VycmVudFNjcmlwdC4gVHJ5aW5nIGZhbGxiYWNrLicpO1xuICB9XG4gIHJldHVybiBkb2N1bWVudC5jdXJyZW50U2NyaXB0IHx8IGRvY3VtZW50LnNjcmlwdHNbZG9jdW1lbnQuc2NyaXB0cy5sZW5ndGggLSAxXTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7XG4iXX0=
