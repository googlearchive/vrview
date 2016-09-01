var EventEmitter = require('eventemitter3');
var shaka = require('shaka-player');

var Types = {
  HLS: 1,
  DASH: 2,
  VIDEO: 3
}

/**
 * Supports regular video URLs (eg. mp4), as well as adaptive manifests like
 * DASH (.mpd) and soon HLS (.m3u8).
 *
 * Events:
 *   load(video): When the video is loaded.
 *   error(message): If an error occurs.
 *
 * To play/pause/seek/etc, please use the underlying video element.
 */
function AdaptivePlayer() {
  this.video = document.createElement('video');

  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();

  if (!shaka.Player.isBrowserSupported()) {
    console.error('Shaka is not supported on this browser.');
  } else {
    this.initShaka_();
  }

}
AdaptivePlayer.prototype = new EventEmitter();

AdaptivePlayer.prototype.load = function(url) {
  var self = this;
  // TODO(smus): Investigate whether or not differentiation is best done by
  // mimeType after all. Cursory research suggests that adaptive streaming
  // manifest mime types aren't properly supported.
  //
  // For now, make determination based on extension.
  var extension = Util.getExtension(url);
  switch (extension) {
    case 'm3u8': // HLS
      this.type = Types.HLS;
      if (Util.isIOS()) {
        this.loadVideo_(url).then(function() {
          self.emit('load', self.video);
        }).catch(this.onError_.bind(this));
      } else {
        self.onError_('HLS is only supported on iOS.');
      }
      break;
    case 'mpd': // MPEG-DASH
      this.type = Types.DASH;
      this.player.load(url).then(function() {
        console.log('The video has now been loaded!');
        self.emit('load', self.video);
      }).catch(this.onError_.bind(this));
      break;
    default: // A regular video, not an adaptive manifest.
      this.type = Types.VIDEO;
      this.loadVideo_(url).then(function() {
        self.emit('load', self.video);
      }).catch(this.onError_.bind(this));
      break;
  }
};


/*** PRIVATE API ***/

AdaptivePlayer.prototype.initShaka_ = function() {
  this.player = new shaka.Player(this.video);

  // Listen for error events.
  this.player.addEventListener('error', this.onError_);
};

AdaptivePlayer.prototype.onError_ = function(e) {
  console.error(e);
  this.emit('error', e);
};

AdaptivePlayer.prototype.loadVideo_ = function(url) {
  var video = this.video;
  return new Promise(function(resolve, reject) {
    video.loop = true;
    video.src = url;
    // Enable inline video playback in iOS 10+.
    video.setAttribute('playsinline', true);
    video.setAttribute('crossorigin', 'anonymous');
    video.addEventListener('canplaythrough', resolve);
    video.addEventListener('error', reject);
    video.load();
  });
};

module.exports = AdaptivePlayer;
