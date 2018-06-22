const icy = require('icy');
const { URL } = require('url');

const event = require('./helpers/event');

class TagsParser {

  constructor(options) {
    this.options = options;
    this.fails = 0;
    this.maxFails = 3;
    this.timeout = 30 * /*60 **/ 1000; // m s ms

    this.init();

    event.emit('stats.init', this.options.id);
    event.on(`${this.options.id}.end`, e => this.restart(e));

    return this;
  }

  init() {
    return new Promise((resolve, reject) => {

      let options = new URL(this.options.src);
      options.headers = {
        'User-Agent': 'titleturtle/' + require('../package.json').version
      };

      let req = icy.get(options, stream => resolve(this.callbackIcy(stream)));

      req.on('error', e => {
        console.log(`[${this.options.id}] Error.`);
        reject(e);
      });
      /*req.on('close', e => {
        console.log(`[${this.options.id}] Closed.`);
        event.emit(`${this.options.id}.end`, e);
        reject(e);
      });*/

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

    this.closeWorkaround = setTimeout(() => {
      console.log(`[${this.options.id}] 0 fails! (normal behaviour)`);
      this.fails = 0;
    }, 15000);
    console.log(`[${this.options.id}] Connected.`);

    let htmlWorkaround = e => {
      if (e.toString().includes('<html>')) {
        return this.restart();
      }
      stream.removeListener('data', htmlWorkaround);
    };

    stream.on('data', e => htmlWorkaround(e));

    stream.on('metadata', metadata => {
      let [artist, title] = icy.parse(metadata).StreamTitle.split(' - ');
      event.emit(`${this.options.id}.update`, {
        station: this.options.id,
        artist: artist || '',
        title: title || '',
        date: +new Date
      });
      if (this.paused) {
        return;
      }
      stream.resume();
    });
    stream.on('error', e => {
      console.log(`[${this.options.id}] Error!.`, e);
    });
    stream.on('end', e => {
      console.log(`[${this.options.id}] End o.o`);
      event.emit(`${this.options.id}.end`, e);
    });

    return this.stream = stream;
  }

  async pause() {
    if (!this.stream) {
      await this.init();
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
      return await this.init();
    }
    this.stream.resume();
    this.paused = false;
    console.log(`[${this.options.id}] Resumed.`);
  }

  fini() {
    if (this.stream) {
      this.stream.removeAllListeners();
    }
    this.stream = undefined;
  }

  restart() {
    clearTimeout(this.closeWorkaround);
    let timeout = 5000 * this.fails++ + 15000;

    this.fini();

    if (this.fails >= this.maxFails) {
      timeout = this.timeout;
    }

    event.emit(`${this.options.id}.update`, {
      station: this.options.id,
      artist: this.options.src,
      title: `Переподключение через ${timeout/1000} секунд...`,
      date: +new Date
    });

    console.log(`[${this.options.id}] Restart in ${timeout/1000} seconds.`);
    setTimeout(async () => {
      console.log(`[${this.options.id}] Restarting...`);
      this.init();
    }, timeout);
  }
}

module.exports = TagsParser;