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

      let req = icy.get(options, stream => resolve(this.callbackIcy(stream)));

      req.on('error', e => {
        console.log(`[${this.options.id}] Error.`);
        event.emit(`${this.options.id}.end`, e);
        reject(e);
      });
      req.on('close', e => {
        console.log(`[${this.options.id}] Closed.`);
        event.emit(`${this.options.id}.end`, e);
        reject(e);
      });

      setTimeout(() => reject('Timeout!'), 15000);

    }).catch(e => {
      console.log(e.message || e);
      return () => {};
    })
  }

  async callbackIcy(stream) {
    if (this.options.lazy) {
      await this.pause();
    }

    this.closeWorkaround = setTimeout(() => this.reconnects = 0, 5000);
    console.log(`[${this.options.id}] Connected.`);

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

    return this.stream = stream;
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
    console.log(`[${this.options.id}] Paused.`);
  }

  async resume() {
    if (!this.stream) {
      return await this.getIcy();
    }
    this.stream.resume();
    this.paused = false;
    console.log(`[${this.options.id}] Resumed.`);
  }

  restart() {
    clearTimeout(this.closeWorkaround);

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
    console.log(`[${this.options.id}] Restart in ${secs} seconds.`);
    setTimeout(async () => {
      console.log(`[${this.options.id}] Restarting...`);
      this.getIcy();
    }, secs * 1000);
  }
}

module.exports = TagsParser;
