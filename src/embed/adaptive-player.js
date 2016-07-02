var Emitter = require('../emitter');
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
  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();

  this.initPlayer_();
}
AdaptivePlayer.prototype = new Emitter();

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
      console.error('HLS is not yet supported.');
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

AdaptivePlayer.prototype.initPlayer_ = function() {
  // Create a Player instance.
  var video = document.createElement('video');
  var player = new shaka.Player(video);

  // Listen for error events.
  player.addEventListener('error', this.onError_);

  // Save player.
  this.player = player;
  this.video = video;
}

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
    video.setAttribute('webkit-playsinline', true);
    video.setAttribute('crossorigin', 'anonymous');
    video.addEventListener('canplaythrough', resolve);
    video.addEventListener('error', reject);
    video.load();
  });
};

module.exports = AdaptivePlayer;
