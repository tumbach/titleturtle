module.exports = class History {

  constructor(length, ttl) {
    this.history = [];
    if (ttl) {
      this.ttl = ttl;
      setTimeout(() => this.removeOldEntries(), ttl / 100);
    }
    if (length) {
      this.length = length;
    }
  }

  add(entry) {
    let last = this.get(1);
    if (last && (entry.title === last.title) && (entry.artist === last.artist)) {
      return false;
    }
    this.history.push(entry);
    if (this.length && this.history.length > this.length) {
      return this.removeOldEntries();
    }
  }

  get(count) {
    return this.history.slice(-count) || null;
  }

  removeOldEntries() {
    if (this.length) {
      this.history = this.history.slice(-this.length);
    }
    if (this.ttl) {
      this.history = this.history.filter(entry => (entry.date + this.ttl) >= History.now())
    }
  }

  static now() {
    return Math.floor(new Date() / 1e3);
  }

};
