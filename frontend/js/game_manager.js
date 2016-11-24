function GameManager(size, InputManager, Actuator) {
	this.size           = size; // Size of the grid
	this.inputManager   = new InputManager;
	this.actuator       = new Actuator;

	this.startTiles     = 2;
	this.addTileSequence = [1,1,1,3];
	this.moveSequence 	= 0;

	this.solverStudentId = '';
	this.solverPassPhrase = '';
	this.evilStudentId = '';
	this.evilPassPhrase = '';

	this.gameStart = false;
	this.runningAi = false;

	this.solverTurn = false;
	this.gamelog = [];

	this.inputManager.on("restart", this.restart.bind(this));
	this.inputManager.on("finished", this.finished.bind(this));
	this.inputManager.on("replay", this.replay.bind(this));

	var self = this;
	$('#download-log').click(function(){
		var csv = JSON.stringify(self.gamelog);
		var csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv);
		this.href = csvData;
		this.target = '_blank';
		this.download = 'game_log.txt';
	});

	this.setup();
}

function checkInputEmpty(input) {
	if($(input).val() == '') {
		return false;
	}
	return true;
}

GameManager.prototype.restart = function () {
	if(this.gameStart == false) {
		this.gameStart = true;
		this.changeRunningAiStatus(true, false);
		this.start();
	}
	else if(this.runningAi == true) {
		this.changeRunningAiStatus(false, false);
	}
	else {
		this.changeRunningAiStatus(true, false);
		var serializedTiles = this.grid.serializeToString();
		if(this.solverTurn == true) {
			$.post('/api/', {
				serializedTiles: serializedTiles,
				aiType: 'solver',
				studentId: this.solverStudentId,
				passPhrase: this.solverPassPhrase,
				moveSequence: this.moveSequence,
				submit: true
			}, this.receivedSolverHandler.bind(this));
		}
		else {
			$.post('/api/', {
				serializedTiles: serializedTiles,
				aiType: 'evil',
				studentId: this.evilStudentId,
				passPhrase: this.evilPassPhrase,
				moveSequence: this.moveSequence,
				submit: true
			}, this.receivedEvilHandler.bind(this));
		}
	}
};

// start the game
GameManager.prototype.start = function () {
	this.gamelog.length = 0;
	this.actuator.continueGame(); // Clear the game won/lost message
	var successCount = 0;

	var errorMessage = '';
	if(checkInputEmpty('#solver-student-id')) {
		this.solverStudentId = $('#solver-student-id').val();
		successCount++;
	}
	else
	errorMessage += 'Please input solver student ID!\n';
	if(checkInputEmpty('#solver-pass-phrase')) {
		this.solverPassPhrase = $('#solver-pass-phrase').val();
		successCount++;
	}
	else
	errorMessage += 'Please input solver pass phrase!\n';
	if(checkInputEmpty('#evil-student-id')) {
		this.evilStudentId = $('#evil-student-id').val();
		successCount++;
	}
	else
	errorMessage += 'Please input evil student ID!\n';
	if(checkInputEmpty('#evil-pass-phrase')) {
		this.evilPassPhrase = $('#evil-pass-phrase').val();
		successCount++;
	}
	else
	errorMessage += 'Please input evil pass phrase!\n';
	if(successCount == 4) {
		$('.client-inputs input').attr('readonly', 'readonly');
	}
	else {
		alert(errorMessage);
		return;
	}
	this.setup();
	this.startAiPlay();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
	this.keepPlaying = true;
	this.actuator.continueGame(); // Clear the game won/lost message
};

GameManager.prototype.finished = function () {
	this.changeRunningAiStatus(false, true);
	this.actuator.continueGame();
	var temp = $('#solver-student-id').val();
	$('#solver-student-id').val($('#evil-student-id').val());
	$('#evil-student-id').val(temp);
	temp = $('#solver-pass-phrase').val();
	$('#solver-pass-phrase').val($('#evil-pass-phrase').val());
	$('#evil-pass-phrase').val(temp);
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
	return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
	// Reload the game from a previous game if present

	this.grid        = new Grid(this.size);
	this.score       = 0;
	this.over        = false;
	this.won         = false;
	this.keepPlaying = false;
	this.moveSequence = 0;
	this.startTiles  = 2;
	// Add the initial tiles
	//this.addStartTiles();

	// Update the actuator
	this.actuate();
};

GameManager.prototype.startAiPlay = function () {
	var serializedTiles = this.grid.serializeToString();
	$.post('/api/', {
		serializedTiles: serializedTiles,
		aiType: 'evil',
		studentId: this.evilStudentId,
		passPhrase: this.evilPassPhrase,
		moveSequence: this.moveSequence,
		submit: true
	}, this.receivedEvilHandler.bind(this));
	this.startTiles--;
}

GameManager.prototype.changeRunningAiStatus = function (isRunning, resetGame) {
	this.runningAi = isRunning;
	if(isRunning == true) {
		$('.restart-button').html('Pause');
	}
	else if(isRunning == false) {
		this.runningAi = isRunning;
		if(resetGame == false) {
			$('.restart-button').html('Resume');
		}
		else {
			this.gameStart = false;
			$('.restart-button').html('Start Game');
			$('.client-inputs input').removeAttr('readonly');
		}
	}
};

GameManager.prototype.receivedSolverHandler = function (data) {
	if(data == 'FAIL' || data == 'TIMEOUT' || data == 'PPERROR' || data == 'RUNNINGERROR') {
		alert('Solver client error: ' + data);
		this.changeRunningAiStatus(false, true);
		return;
	}
	if(this.over == false) {
		var moveDirection = parseInt(data);
		var success = this.move(moveDirection);
		var logstring = "";
		if(success == false) {
			logstring = moveDirection + "e";
			//this.score -= 50;
			while(success == false) {
				moveDirection = Math.floor(Math.random() * 4);
				success = this.move(moveDirection);
			}
		}
		logstring = logstring + moveDirection;
		this.gamelog.push(logstring);
		this.actuate();
		this.solverTurn = false;
		if(this.runningAi == false)
			return;
		var serializedTiles = this.grid.serializeToString();
		$.post('/api/', {
			serializedTiles: serializedTiles,
			aiType: 'evil',
			studentId: this.evilStudentId,
			passPhrase: this.evilPassPhrase,
			moveSequence: this.moveSequence,
			submit: true
		}, this.receivedEvilHandler.bind(this));
	}
};

GameManager.prototype.receivedEvilHandler = function (data) {
	if(data == 'FAIL' || data == 'TIMEOUT' || data == 'PPERROR' || data == 'RUNNINGERROR') {
		alert('Evil client error: ' + data);
		this.changeRunningAiStatus(false, true);
		return;
	}
	var addTilePosition = parseInt(data);
	var success = this.addEvilTile(addTilePosition);
	var logstring = "";
	if(success == false) {
		logstring = addTilePosition + "e";
		//this.score += 50;
		while(success == false) {
			addTilePosition = Math.floor(Math.random() * 16);
			success = this.addEvilTile(addTilePosition);
		}
	}
	logstring = logstring + addTilePosition;
	this.gamelog.push(logstring);
	if (!this.movesAvailable()) {
		this.over = true; // Game over!
		this.changeRunningAiStatus(false, true);
		this.actuate();
		return;
	}
	this.actuate();
	var serializedTiles = this.grid.serializeToString();
	if(this.startTiles == 1) {
		this.startTiles--;
		this.solverTurn = false;
		if(this.runningAi == false)
			return;
		$.post('/api/', {
			serializedTiles: serializedTiles,
			aiType: 'evil',
			studentId: this.evilStudentId,
			passPhrase: this.evilPassPhrase,
			moveSequence: this.moveSequence,
			submit: true
		}, this.receivedEvilHandler.bind(this));
	}
	else if(this.over == false) {
		this.solverTurn = true;
		if(this.runningAi == false)
			return;
		$.post('/api/', { 
			serializedTiles: serializedTiles,
			aiType: 'solver',
			studentId: this.solverStudentId,
			passPhrase: this.solverPassPhrase,
			moveSequence: this.moveSequence,
			submit: true
		}, this.receivedSolverHandler.bind(this));
	}
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
	for (var i = 0; i < this.startTiles; i++) {
		this.addRandomTile();
	}
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
	if (this.grid.cellsAvailable()) {
		var addTileIndex = this.moveSequence % 4;
		var value = this.addTileSequence[addTileIndex];
		this.moveSequence += 1;
		var tile = new Tile(this.grid.randomAvailableCell(), value);
		this.grid.insertTile(tile);
	}
};

GameManager.prototype.addEvilTile = function (cellPosition) {
	if (this.grid.cellsAvailable()) {
		var cell = { x: cellPosition % 4, y: Math.floor(cellPosition / 4) };
		if(this.grid.cellAvailable(cell)) {
			var addTileIndex = this.moveSequence % 4;
			var value = this.addTileSequence[addTileIndex];
			this.moveSequence += 1;
			var tile = new Tile(cell, value);
			this.grid.insertTile(tile);
			return true;
		}
		return false;
	}
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {

	this.actuator.actuate(this.grid, {
score:      this.score,
over:       this.over,
won:        this.won,
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

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
	// 0: up, 1: right, 2: down, 3: left
	var self = this;

	if (this.isGameTerminated()) return false; // Don't do anything if the game's over

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
				if (next && self.tileValueMergeAvailable(next.value, tile.value) && !next.mergedFrom) {
					var merged = new Tile(positions.next, Math.max(next.value, tile.value) + 1);
					merged.newTile = false;
					merged.mergedFrom = [tile, next];

					self.grid.insertTile(merged);
					self.grid.removeTile(tile);

					// Converge the two tiles' positions
					tile.updatePosition(positions.next);

					// Update the score
					var tileValues = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811];
					self.score += tileValues[merged.value];

					// The mighty 2048 tile
					//if (merged.value === 17) self.won = true;
				} else {
					self.moveTile(tile, positions.farthest);
				}

				if (!self.positionsEqual(cell, tile)) {
					moved = true; // The tile moved from its original cell!
				}
			}
		});
	});

	if (moved) {
		return true;
	}
	return false;
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

					if (other && self.tileValueMergeAvailable(other.value, tile.value)) {
						return true; // These two tiles can be merged
					}
				}
			}
		}
	}

	return false;
};

GameManager.prototype.tileValueMergeAvailable = function (first, second) {
	return (first == 1 && second == 1) || Math.abs(first - second) == 1;
};

GameManager.prototype.positionsEqual = function (first, second) {
	return first.x === second.x && first.y === second.y;
};

GameManager.prototype.replay = function () {
	if(typeof this.timeVar != 'undefined') {
		clearTimeout(this.timeVar);
		delete this.timeVar;
	}

	this.actuator.continueGame();
	this.setup();
	this.gamelog = JSON.parse($('#game-log').val());
	var i = 0;
	var self = this;
	var playOneLog = function() {
		if(i == 0 || i % 2 == 1) {
			if(self.gamelog[i].indexOf("e") > -1) { // evil made an illegal move
				//self.score += 50;
				var index = self.gamelog[i].indexOf("e");
				self.gamelog[i] = self.gamelog[i].substr(index + 1);
			}
			self.addEvilTile(Number(self.gamelog[i]));
			if(i != 0 && i != self.gamelog.length - 1)
			self.actuate();
		}
		else {
			if(self.gamelog[i].indexOf("e") > -1) { // player made an illegal move
				//self.score -= 50;
				var index = self.gamelog[i].indexOf("e");
				self.gamelog[i] = self.gamelog[i].substr(index + 1);
			}
			self.move(Number(self.gamelog[i]));
		}
		if(i == self.gamelog.length - 1) {
			self.over = true; // Game over!
			delete self.timeVar;
			self.actuate();
			return;
		}
		i++;
		self.timeVar = setTimeout(playOneLog, parseInt($('#replay-speed').val()));
	};
	playOneLog();
};
