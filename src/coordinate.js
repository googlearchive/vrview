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
