const { IcecastMetadataStream } = require("icecast-metadata-js");
const { writableNoopStream: devNull } = require('noop-stream');

const event = require('./helpers/event.js');
const HTTPRequester = require('./helpers/HTTPRequester.js');

class Station {

  #endpoint;
  #playlistURL;
  #onTagUpdate;
  #stream;

  constructor({id, name, playlist}) {
    this.id = id;
    this.name = name;
    this.#playlistURL = playlist;

    this.tags = {};
    this.playlist = [];
  }

  onTagUpdate(callback) {
    event.on(`${this.id}.update`, callback);
  }

  offTagUpdate(callback) {
    event.off(`${this.id}.update`, callback);
  }

  getTags(now) {
    let out = Object.assign({}, this.tags);
    if (now) {
      out.now = Station.now();
    }
    return out;
  }

  setTags(tags) {
    this.tags = {
      artist: tags.artist || null,
      title: tags.title || null,
      date: tags.date ?? Station.now(),
    };
    event.emit(`${this.id}.update`, this.getTags(false));
  }

  async getPlaylist() {
    if (Array.isArray(this.#playlistURL)) {
      let playlist = this.#playlistURL.join('\n');
      this.playlist = this.parsePlaylist(playlist);
      this.#endpoint = this.playlist.slice(-1).pop().url;
      return this.playlist;
    }
    let request = new HTTPRequester({
      url: this.#playlistURL
    })
    let response = await request.request();
    if (response.statusCode >= 400) {
      return false;
    }
    let list = response.body.toString('utf8');
    this.playlist = this.parsePlaylist(list);
    this.#endpoint = this.playlist.slice(-1).pop().url;
    return this.playlist;
  }

  parsePlaylist(list) {
    let urls = list.match(/^(?!#)(?!\s).*$/mg) || [];
    let descriptions = list.match(/(?<=^#EXTINF.*?,\W?)(.*)$/mg) || [];
    return urls.filter(Boolean).map((url, i) => {
      return {
        url,
        description: descriptions[i]
      }
    });
  }

  #fetch(stream) {
    try {
      stream.on('response', response => {
        let {statusCode, headers} = response;
        if (statusCode >= 500) {
          return this.reconnect(30e3);
        }
        let mime = headers['content-type'];
        let bitrate = headers['icy-br'];
        let metaint = headers['icy-metaint'];

        const icecast = new IcecastMetadataStream({
          icyBr: +bitrate,
          icyMetaInt: +metaint,
          metadataTypes: mime.endsWith('ogg')
            ? ['ogg']
            : ['icy']
        });
        icecast.metadata.on('data', data => this.#parseTags(data));
        icecast.metadata.on('error', e => {
          this.reconnect(30e3, e);
        });
        response.pipe(icecast);
        icecast.stream.pipe(devNull());
        icecast.metadata.pipe(devNull({ objectMode: true }));
      });
      stream.on('done', e => {
        this.reconnect(5e3, e);
      });
      stream.on('timeout', e => {
        this.reconnect(10e3, e);
      });
      stream.on('error', e => {
        this.reconnect(30e3, e);
      });
    } catch (err) {
      this.reconnect(30e3, err);
    }
  }

  reconnect(ms = 30e3, e) {
    e && console.error(e);
    if (!Object.keys(this.tags).length) {
      console.log(`[${this.id}] Reconnect is not needed: no tags were fetched. (${this.#endpoint})`);
      return false;
    }
    console.log(`[${this.id}] Reconnect in ${ms} ms. (${this.#endpoint})`);
    this.pause();
    setTimeout(() => {
      this.play();
    }, ms);
  }

  play() {
    if (this.isPlaying()) {
      return true;
    }
    let request = new HTTPRequester({
      url: this.#endpoint
    })
    this.#stream = request.stream({
      headers: {
        'Icy-Metadata': '1'
      }
    });
    this.#fetch(this.#stream);
  }

  pause() {
    if (!this.isPlaying()) {
      return true;
    }
    if (this.#stream.request) {
      this.#stream.request.abort();
    }
    this.#stream.destroy();
    this.#stream = null;
  }

  isPlaying() {
    return !!this.#stream;
  }

  #parseTags({metadata/*, time*/}) {
    let tags = {
      artist: metadata.ARTIST || null,
      title: metadata.TITLE || null
    }

    if (metadata.StreamTitle) {
      let [ artist, title ] = metadata.StreamTitle.split(' - ');
      tags.artist = artist;
      tags.title = title;
    }

    this.setTags(tags);
    if (typeof this.#onTagUpdate === 'function') {
      this.#onTagUpdate(tags);
    }
  }

  static now() {
    return Math.floor(+new Date() / 1e3);
  }

}

module.exports = Station;
