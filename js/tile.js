var elementSymbols = {
  "2": "He",
  "4": "C",
  "8": "O",
  "16": "F",
  "32": "K",
  "64": "Fe",
  "128": "Zn",
  "256": "Br",
  "512": "Kr",
  "1024": "Au",
  "2048": "2048"
};

function Tile(position, value) {
  this.x                = position.x;
  this.y                = position.y;
  this.value            = value || 2;

  this.previousPosition = null;
  this.mergedFrom       = null; // Tracks tiles that merged together
}

Tile.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y };
};

Tile.prototype.updatePosition = function (position) {
  this.x = position.x;
  this.y = position.y;
};

Tile.prototype.serialize = function () {
  return {
    position: {
      x: this.x,
      y: this.y
    },
    value: this.value
  };
};
