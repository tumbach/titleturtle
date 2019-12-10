module.exports = class History {

  constructor(length) {
    this.history = [];
    this.length = length;
  }

  add(track) {
    this.history.push(track);
    if (this.history.length > this.length) {
      this.history = this.history.slice(1);
    }
  }

  get(count) {
    return this.history.slice(-count);
  }

};
