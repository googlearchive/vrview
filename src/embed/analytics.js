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

function Analytics() {
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-35315454-8', 'auto');
  ga('send', 'pageview');

  this.lastModeChangeTime = window.performance.now();
  this.lastModeLabel = Analytics.MODE_LABELS[0];
}

Analytics.MODE_LABELS = {
  0: 'UNKNOWN',
  1: 'NORMAL',
  2: 'MAGIC_WINDOW',
  3: 'VR'
};


Analytics.prototype.logModeChanged = function(mode) {
  var modeLabel = Analytics.MODE_LABELS[mode];
  var lastModeLabel = Analytics.MODE_LABELS[this.lastMode];

  console.log('Analytics: going from mode %s to %s', lastModeLabel, modeLabel);

  ga('send', 'screenview', {
    appName: 'EmbedVR',
    screenName: modeLabel
  });

  var now = window.performance.now();
  var msSinceLastModeChange = Math.round(now - this.lastModeChangeTime);
  ga('send', 'timing', 'Time spent in mode', lastModeLabel, msSinceLastModeChange);

  this.lastModeChangeTime = now;
  this.lastMode = mode;
}

window.analytics = new Analytics();
