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

THREE = require('../node_modules/three/three');
var Eyes = require('./eyes');
var Util = require('./util');

var DEFAULT_FOV = 40;
var NO_DISTORTION = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
/**
 * Responsible for distortion correction by pre-distorting the vertex geometry
 * so that a second shader pass is not needed. This is intended to greatly
 * optimize the rendering process.
 */
function VertexDistorter(deviceInfo) {
  this.texture = null;
  this.isEnabled = false;

  this.deviceInfo = deviceInfo;
}

VertexDistorter.prototype.setEnabled = function(isEnabled) {
  this.isEnabled = isEnabled;
}

/**
 * Sets the texture that is used to render this photosphere.
 */
VertexDistorter.prototype.setMap = function(texture) {
  this.texture = texture;
};

VertexDistorter.prototype.getVertexShader_ = function() {
  return [
		'#ifdef GL_ES',
		'precision highp float;',
		'#endif',

    'varying vec2 vUV;',

    this.getDistortionInclude_(),

    'void main() {',
      // Pass through texture coordinates to the fragment shader.
      'vUV = uv;',

      // Here, we want to ensure that we are using an undistorted projection
      // matrix. By setting isUndistorted: true in the WebVRManager, we
      // guarantee this.
      'vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',

      'gl_Position = Distort(pos);',
    '}'
  ].join('\n');
};

VertexDistorter.prototype.getNoopVertexShader_ = function() {
  return [
		'#ifdef GL_ES',
		'precision highp float;',
		'#endif',

    'varying vec2 vUV;',

    'void main() {',
      'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      'vUV = uv;',
    '}'
  ].join('\n');
};

VertexDistorter.prototype.getFragmentShader_ = function() {
  return [
		'#ifdef GL_ES',
		'precision highp float;',
		'#endif',

    'varying vec2 vUV;',
    'uniform sampler2D texture;',

    'void main() {',
      'gl_FragColor = texture2D(texture, vUV);',
    '}'
  ].join('\n');
};

VertexDistorter.prototype.getNoopDistortionInclude_ = function() {
  return [
    'vec4 Distort(vec4 point) {',
      'return point;',
    '}'
  ].join('\n');
};

VertexDistorter.prototype.getDistortionInclude_ = function() {
  return [
    'uniform float uDistortionCoefficients[12];',
    'uniform float uDistortionMaxFovSquared;',
    'uniform vec2 uDistortionFovOffset;',
    'uniform vec2 uDistortionFovScale;',

    // Returns a scalar to distort a point; computed in reverse via the polynomial approximation:
    //   r' = 1 + Σ_i (uDistortionCoefficients[i] rSquared^(i+1))  i=[0..11]
    // where rSquared is the squared radius of an undistorted point in tan-angle space.
    // See {@link Distortion} for more information.
    'float DistortionFactor(float rSquared) {',
      'float ret = 0.0;',
      'rSquared = min(uDistortionMaxFovSquared, rSquared);',
      'ret = rSquared * (ret + uDistortionCoefficients[11]);',
      'ret = rSquared * (ret + uDistortionCoefficients[10]);',
      'ret = rSquared * (ret + uDistortionCoefficients[9]);',
      'ret = rSquared * (ret + uDistortionCoefficients[8]);',
      'ret = rSquared * (ret + uDistortionCoefficients[7]);',
      'ret = rSquared * (ret + uDistortionCoefficients[6]);',
      'ret = rSquared * (ret + uDistortionCoefficients[5]);',
      'ret = rSquared * (ret + uDistortionCoefficients[4]);',
      'ret = rSquared * (ret + uDistortionCoefficients[3]);',
      'ret = rSquared * (ret + uDistortionCoefficients[2]);',
      'ret = rSquared * (ret + uDistortionCoefficients[1]);',
      'ret = rSquared * (ret + uDistortionCoefficients[0]);',
      'return ret + 1.0;',
    '}',

    // Given a point in clip space, distort the point according to the coefficients stored in
    // uDistortionCoefficients and the field of view (FOV) specified in uDistortionFovOffset and
    // uDistortionFovScale.
    // Returns the distorted point in clip space, with its Z untouched.
    'vec4 Distort(vec4 point) {',
      // Put point into normalized device coordinates (NDC), [(-1, -1, -1) to (1, 1, 1)].
      'vec3 pointNdc = point.xyz / point.w;',
      // Throw away the Z coordinate and map the point to the unit square, [(0, 0) to (1, 1)].
      'vec2 pointUnitSquare = (pointNdc.xy + vec2(1.0)) / 2.0;',
      // Map the point into FOV tan-angle space.
      'vec2 pointTanAngle = pointUnitSquare * uDistortionFovScale - uDistortionFovOffset;',
      'float radiusSquared = dot(pointTanAngle, pointTanAngle);',
      'float distortionFactor = DistortionFactor(radiusSquared);',
      //'float distortionFactor = 2.0;',
      'vec2 distortedPointTanAngle = pointTanAngle * distortionFactor;',
      // Reverse the mappings above to bring the distorted point back into NDC space.
      'vec2 distortedPointUnitSquare = (distortedPointTanAngle + uDistortionFovOffset)',
          '/ uDistortionFovScale;',
      'vec3 distortedPointNdc = vec3(distortedPointUnitSquare * 2.0 - vec2(1.0), pointNdc.z);',
      // Convert the point into clip space before returning in case any operations are done after.
      'return vec4(distortedPointNdc, 1.0) * point.w;',
    '}',
  ].join('\n');
};

VertexDistorter.prototype.getDistortionMaxFovSquared_ = function() {
  var fov = this.getFov_();
  var maxFov = Util.hypot(
    Math.tan(THREE.Math.degToRad(Math.max(fov.leftDegrees, fov.rightDegrees))),
    Math.tan(THREE.Math.degToRad(Math.max(fov.downDegrees, fov.upDegrees))));
  return maxFov * maxFov;
};

VertexDistorter.prototype.getDistortionCoefficients_ = function() {
  var viewer = this.deviceInfo.viewer;
  return this.isEnabled ? viewer.inverseCoefficients : NO_DISTORTION;
};

VertexDistorter.prototype.getDistortionFovOffset_ = function(eye) {
  var fov = this.getFov_(eye);
  /*
  var sideDegrees = Math.min(fov.leftDegrees, fov.rightDegrees);
  var left = Math.tan(THREE.Math.degToRad(sideDegrees));
  */
  var left = Math.tan(THREE.Math.degToRad(fov.leftDegrees));
  var down = Math.tan(THREE.Math.degToRad(fov.downDegrees));
  return new THREE.Vector2(left, down);
};

VertexDistorter.prototype.getDistortionFovScale_ = function() {
  var fov = this.getFov_();
  var left = Math.tan(THREE.Math.degToRad(fov.leftDegrees));
  var right = Math.tan(THREE.Math.degToRad(fov.rightDegrees));
  var up = Math.tan(THREE.Math.degToRad(fov.upDegrees));
  var down = Math.tan(THREE.Math.degToRad(fov.downDegrees));
  return new THREE.Vector2(left + right, up + down);
};


VertexDistorter.prototype.getUniforms_ = function(eye) {
  return {
    texture: {
      type: 't',
      value: this.texture
    },
    uDistortionCoefficients: {
      type: 'fv1',
      value: this.getDistortionCoefficients_()
    },
    uDistortionMaxFovSquared: {
      type: 'f',
      value: this.getDistortionMaxFovSquared_()
    },
    uDistortionFovOffset: {
      type: 'v2',
      value: this.getDistortionFovOffset_(eye)
    },
    uDistortionFovScale: {
      type: 'v2',
      value: this.getDistortionFovScale_()
    }
  };
};

VertexDistorter.prototype.getShaderMaterial = function(eye) {
  var uniforms = this.getUniforms_(eye);
  return new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: this.getVertexShader_(),
    fragmentShader: this.getFragmentShader_()
  });
};

VertexDistorter.prototype.getFov_ = function(opt_eye) {
  var eye = opt_eye || Eyes.LEFT;

  if (eye == Eyes.LEFT) {
    return this.deviceInfo.getFieldOfViewLeftEye(true);
  }
  if (eye == Eyes.RIGHT) {
    return this.deviceInfo.getFieldOfViewRightEye(true);
  }
  return null;
};

module.exports = VertexDistorter;
