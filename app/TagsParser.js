const icy = require('icy');
const { URL } = require('url');

const event = require('./helpers/event');

class TagsParser {
  constructor(options) {
    this.options = options;
    this.reconnects = 0;

    this.getIcy();

    event.emit('stats.init', this.options.id);
    event.on(`${this.options.id}.end`, e => this.restart(e));
    return this;
  }

  getIcy() {
    return new Promise((resolve, reject) => {
      let options = new URL(this.options.src);
      options.headers = {
        'User-Agent': 'titleturtle/' + require('../package.json').version
      };
      let req = icy.get(
        options,
        async stream => {
          resolve(this.stream = stream);
          this.callbackIcy(stream);
          if (this.options.lazy) {
            await this.pause();
          }
        }
      );
      req.on('error', e => {
        console.log(`${this.options.id} has an error.`);
        event.emit(`${this.options.id}.end`, e);
        reject(e);
      });
      setTimeout(() => reject('Timeout!'), 15000);
    }).catch(e => {
      console.log(e.message || e);
      return () => {};
    })
  }

  callbackIcy(stream) {
    this.reconnects = 0;
    console.log(`${this.options.id} is connected.`);
    stream.on('metadata', metadata => {
      let [artist, title] = icy.parse(metadata).StreamTitle.split(' - ');
      event.emit(`${this.options.id}.update`, {
        station: this.options.id,
        artist: artist || '',
        title: title || '',
        date: new Date
      });
      if (this.paused) {
        return;
      }
      stream.resume();
    });
    stream.on('end', e => {
      event.emit(`${this.options.id}.end`, e);
    });
  }

  async pause() {
    if (!this.stream) {
      await this.getIcy();
    }
    if (!this.stream) {
      return;
    }
    this.stream.pause();
    this.paused = true;
    console.log(`${this.options.id} is paused.`);
  }

  async resume() {
    if (!this.stream) {
      return await this.getIcy();
    }
    this.stream.resume();
    this.paused = false;
    console.log(`${this.options.id} is resumed.`);
  }

  restart() {
    event.emit(`${this.options.id}.update`, {
      station: this.options.id,
      artist: this.options.src,
      title: 'Нет подключения',
      date: new Date
    });
    if (this.stream) {
      this.stream.removeAllListeners();
    }

    let secs = 15 + 5 * this.reconnects++;
    console.log(`${this.options.id} is ended. Restart in ${secs} seconds...`);
    setTimeout(async () => {
      console.log(`Restarting ${this.options.id}...`);
      this.getIcy();
    }, secs * 1000);
  }
}

module.exports = TagsParser;
