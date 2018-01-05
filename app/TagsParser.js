const icy = require('icy');

const event = require('./helpers/event');

class TagsParser {
  constructor(options) {
    this.options = options;

    if (this.options.lazy) {
      this.pause();
    } else {
      this.getIcy();
    }

    event.emit('stats.init', this.options.id);
    return this;
  }

  getIcy() {
    return new Promise(resolve => {
      icy.get(
        this.options.protocol + '://' + this.options.host + this.options.path,
        stream => {
          this.callbackIcy(stream);
          resolve(this.stream = stream);
        }
      );
    })
  }

  callbackIcy(stream) {
    stream.on('metadata', (metadata) => {
      let [artist, title] = icy.parse(metadata).StreamTitle.split(' - ');
      event.emit(`${this.options.id}.update`, {
        station: this.options.id,
        artist: artist || '',
        title: title || '',
        date: new Date()
      });
      if(this.paused) {
        return;
      }
      stream.resume();
    });
    stream.on('end', () => {
      event.emit(`${this.options.id}.end`);
    });
    stream.on('error', () => {
      event.emit(`${this.options.id}.end`);
    });
  }

  async pause() {
    if (!this.stream) {
      this.stream = await this.getIcy();
    }
    this.stream.pause();
    this.paused = true;
    console.log(`${this.options.id} paused.`);
  }

  resume() {
    this.stream.resume();
    this.paused = false;
    console.log(`${this.options.id} resumed.`);
  }
}

module.exports = TagsParser;
