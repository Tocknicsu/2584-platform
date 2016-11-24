function KeyboardInputManager() {
  this.events = {};
  this.listen();
}

KeyboardInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

KeyboardInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

KeyboardInputManager.prototype.listen = function () {
  this.bindButtonPress(".restart-button", this.restart);
  this.bindButtonPress(".finished-button", this.finished);
  this.bindButtonPress(".replay-button", this.replay);
};

KeyboardInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};

KeyboardInputManager.prototype.finished = function (event) {
  event.preventDefault();
  this.emit("finished");
};

KeyboardInputManager.prototype.replay = function (event) {
	event.preventDefault();
	this.emit("replay");
};

KeyboardInputManager.prototype.bindButtonPress = function (selector, fn) {
  var button = document.querySelector(selector);
  button.addEventListener("click", fn.bind(this));
  button.addEventListener(this.eventTouchend, fn.bind(this));
};
