const icy = require('icy');
const { URL } = require('url');

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
    event.on(`${this.options.id}.end`, e => this.restart(e));
    return this;
  }

  getIcy() {
    return new Promise(resolve => {
      let req = icy.get(
        new URL(this.options.src),
        stream => {
          this.callbackIcy(stream);
          resolve(this.stream = stream);
        }
      );
      req.on('error', e => {
        console.log(`${this.options.id} has an error.`);
        event.emit(`${this.options.id}.end`, e);
      });
    }).catch(e => {
      console.log(e);
    })
  }

  callbackIcy(stream) {
    stream.on('metadata', (metadata) => {
      let [artist, title] = icy.parse(metadata).StreamTitle.split(' - ');
      event.emit(`${this.options.id}.update`, {
        station: this.options.id,
        artist: artist || '',
        title: title || '',
        date: new Date
      });
      if(this.paused) {
        return;
      }
      stream.resume();
    });
    stream.on('end', e => {
      console.log(`${this.options.id} is ended. Restart...`);
      event.emit(`${this.options.id}.end`, e);
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

  restart() {
    event.emit(`${this.options.id}.update`, {
      station: this.options.id,
      artist: this.options.protocol + '://' + this.options.host + this.options.path,
      title: 'Нет подключения',
      date: new Date
    });
    setTimeout(async () => {
      if (!this.stream || this.stream.ended) {
        return this.stream = await this.getIcy();
      }
      this.stream.resume();
    }, 15 * 60 * 1000);
  }
}

module.exports = TagsParser;
