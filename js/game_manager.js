function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
    this.a2        = previousState.a2;
    this.a4        = previousState.a4;
    this.a8        = previousState.a8;
    this.a16        = previousState.a16;
    this.a32        = previousState.a32;
    this.a64        = previousState.a64;
    this.a128        = previousState.a128;
    this.a256        = previousState.a256;
    this.a512        = previousState.a512;
    this.a1024       = previousState.a1024;
    this.a2048       = previousState.a2048;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;
    this.a2        = false;
    this.a4        = false;
    this.a8        = false;
    this.a16        = false;
    this.a32        = false;
    this.a64        = false;
    this.a128        = false;
    this.a256        = false;
    this.a512        = false;
    this.a1024       = false;
    this.a2048       = false;

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
  this.actuate();
  // this.startPopup();
};
// GameManager.prototype.startPopup = function () {
//   window.setTimeout( function() {
//     elements=["Hydrogen: 1", "Helium: 2", "Lithium: 3", "Beryllium: 4", "Boron: 5", "Carbon: 6", 
//     "Nitrogen: 7", "Oxygen: 8", "Flourine: 9", "Neon: 10"]
//     newNum = Math.floor(Math.random() * 9) + 1
  
//     window.alert(elements[newNum]);

//   }, 20000); // From 10 to 110 secconds
// };

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
    //Initial He popup
    window.alert("Helium(He): 2");
  }
  // 2 = He
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated()
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

GameManager.prototype.newpop = function () {
   
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          /****** Level 2 implementation *********/

          //debugging code (gives popup at creation of S)
         /* if(merged.value == 16 && self.a128 == false) {
            self.a128 = true;

            window.alert("Congrats! You reached the 128 tile. Since there are only 118 elements in the periodic table, we will now represent bigger numbers with compounds of the same molecular weight.");
            let ans = window.prompt("What is the approximate molecular weight of HI (enter an integer): ", "");
            if (ans == "128") {
                 window.alert("Correct!");
            }
            else {
                window.alert("Incorrect. The molecular weight of HI is 128.");
            }
          }
          if(merged.value == 32 && self.a128 == true) {
            self.won = true;  
          }*/
          //debugging code end
          // 2 = He
          // if(merged.value == 2 && self.a2 == false) {
          //   self.a2 = true;
          //        window.alert("Helium: 2");
          //   }
          // }
          // 4 = Be
          if(merged.value == 4 && self.a4 == false) {
            self.a4 = true;
            window.alert("Beryllium(Be): 4");
          }
          // 8 = O
          if(merged.value == 8 && self.a8 == false) {
            self.a8 = true;
            window.alert("Oxygen(O): 8");
          }
          // 16 = S
          if(merged.value == 16 && self.a16 == false) {
            self.a16 = true;
            window.alert("Sulfur(S): 16");
          }
          // 32 = Ge
          if(merged.value == 32 && self.a32 == false) {
            self.a32 = true;
            window.alert("Germanium(Ge): 32");
          }
          // 64 = Gd
          if(merged.value == 64 && self.a64 == false) {
            self.a64 = true;
            window.alert("Gadolinimum(Gd): 64");
          }
          // The mighty 128 tile
          if(merged.value == 128 && self.a128 == false) {
            self.a128 = true;

            window.alert("Congrats! You reached the 128 tile. Since there are only 118 elements in the periodic table, we will now represent bigger numbers with compounds of the same molecular weight.");
            let ans = window.prompt("What is the approximate molecular weight of HI (enter an integer): ", "");
            if (ans == "128") {
                 window.alert("Correct!");
            }
            else {
                window.alert("Incorrect. The molecular weight of HI is 128.");
            }
          }
          // The mighty 256 tile
          if(merged.value == 256 && self.a256 == false) {
            self.a256 = true;
            
            let ans = window.prompt("What is the approximate molecular weight of As3P (enter an integer): ", "");
            if (ans == "256") {
                 window.alert("Correct!");
            }
            else {
                window.alert("Incorrect. The molecular weight of As3P is 256.");
            }

          }
          // The mighty 512 tile
          if(merged.value == 512 && self.a512 == false) {
            self.a512 = true;
            let ans = window.prompt("What is the approximate molecular weight of C25H34F6O4 (enter an integer): ", "");
            if (ans == "512") {
                 window.alert("Correct!");
            }
            else {
                window.alert("Incorrect. The molecular weight of C25H34F6O4 is 512.");
            }

          }
          // The mighty 1024 tile
          if(merged.value == 1024 && self.a1024 == false) {
            self.a1024 = true;
            let ans = window.prompt("What is the approximate molecular weight of C70Na8 (enter an integer): ", "");
            if (ans == "1024") {
                 window.alert("Correct!");
            }
            else {
                window.alert("Incorrect. The molecular weight of C70Na8 is 1024.");
            }

          }
          // The mighty 2048 tile
          if(merged.value == 2048 && self.a2048 == false) {
            self.a2048 = true;
            let ans = window.prompt("What is the approximate molecular weight of Au9Ga4 (enter an integer): ", "");
            if (ans == "2048") {
                 window.alert("Correct!");
            }
            else {
                window.alert("Incorrect. The molecular weight of Au9Ga4 is 2048.");
            }
            self.won = true;
          }

          
        } 
        else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = (first, second) => first.x === second.x && first.y === second.y;

