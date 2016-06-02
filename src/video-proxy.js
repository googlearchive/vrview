var Util = require('./util');

/**
 * A proxy class for working around the fact that as soon as a video is play()ed
 * on iOS, Safari auto-fullscreens the video.
 */
function VideoProxy(videoElement) {
  this.videoElement = videoElement;
  // True if we're currently manually advancing the playhead (only on iOS).
  this.isFakePlayback = false;

  // When the video started playing.
  this.startTime = null;
}

VideoProxy.prototype.play = function() {
  if (Util.isIOS()) {
    this.startTime = performance.now();
    this.isFakePlayback = true;

    // Make an audio element to playback just the audio part.
    this.audioElement = new Audio();
    this.audioElement.src = this.videoElement.src;
    this.audioElement.play();
  } else {
    this.videoElement.play();
  }
};

VideoProxy.prototype.stop = function() {
  if (Util.isIOS() && this.isFakePlayback) {
    this.isFakePlayback = true;

    this.audioElement.stop();
  } else {
    this.videoElement.stop();
  }
};

/**
 * Called on RAF to progress playback.
 */
VideoProxy.prototype.update = function() {
  // Fakes playback for iOS only.
  if (this.isFakePlayback) {
    return;
  }
  var delta = performance.now() - this.startTime;
  var deltaS = delta / 1000;
  this.videoElement.currentTime += deltaS;
};

module.exports = VideoProxy;
