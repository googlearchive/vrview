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

/**
 * @param pitch {Number} The latitude of center, specified in degrees, between
 * -90 and 90, with 0 at the horizon.
 * @param yaw {Number} The longitude of center, specified in degrees, between
 * -180 and 180, with 0 at the image center.
 * @param radius {Number} The radius of the hotspot, specified in degrees.
 * @param hotspotId {String} The ID of the hotspot.
 */
Player.prototype.addHotspot = function(pitch, yaw, radius, hotspotId) {
  var data = {
    pitch: pitch,
    yaw: yaw,
    radius: radius,
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

Player.prototype.setImage = function(imageUrl) {
  // TODO(smus): Implement me on the embed side.
  var data = {
    imageUrl: imageUrl
  }
  this.sender.send({type: Message.SET_IMAGE, data: data});
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
