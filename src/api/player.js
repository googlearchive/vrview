var Emitter = require('../emitter');
var IFrameMessageSender = require('./iframe-message-sender');
var Util = require('../util');

var EMBED_URL = '../../index.html?';

/**
 * Entry point for the VR View JS API.
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

Player.prototype.addHotspot = function(p1, p2, callback) {
  var data = {
  };
  this.sender.send({type: 'addhotspot', data: data});
};

Player.prototype.play = function() {
  this.sender.send({type: 'play'});
};

Player.prototype.pause = function() {
  this.sender.send({type: 'pause'});
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
    case 'click':
    case 'modechange':
      this.emit(type, data);
      break;
    default:
      console.warn('Got unknown message of type %s from %s', message.type, message.origin);
  }
};


module.exports = Player;
