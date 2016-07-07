function Coordinate(lat, lon) {
  this.lat = lat;
  this.lon = lon;
};

Coordinate.prototype.toObject = function() {
  return {
    lat: this.lat,
    lon: this.lon
  }
};

module.exports = Coordinate;
