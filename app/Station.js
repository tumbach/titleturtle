const { IcecastMetadataStream } = require("icecast-metadata-js");
const needle = require('needle');

const packageJSON = require('../package.json');
const event = require('./helpers/event.js');

needle.defaults({
  compressed: true,
  user_agent: 'titleturtle/' + packageJSON.version,
  parse_response: false
});

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
      date: tags.date || Station.now(),
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
    let response = await needle('get', this.#playlistURL);
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
      stream.on('header', (statusCode, headers) => {
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
        icecast.metadata.on('data', this.#parseTags.bind(this));
        icecast.metadata.on('error', () => {
          this.reconnect(30e3);
        });
        stream.pipe(icecast);
      });
      stream.on('done', () => {
        this.reconnect(5e3);
      });
      stream.on('timeout', () => {
        this.reconnect(10e3);
      });
      stream.on('error', () => {
        this.reconnect(30e3);
      });
    } catch (err) {
      console.error(err.message);
      this.reconnect(30e3);
    }
  }

  reconnect(ms) {
    console.log(`[${this.id}] Reconnect in ${ms} ms. (${this.#endpoint})`);
    this.pause();
    setTimeout(() => {
      this.play();
    }, ms);
  }

  play() {
    if (this.#stream) {
      return true;
    }
    this.#stream = needle.get(this.#endpoint, {
      headers: {
        'Icy-Metadata': '1'
      }
    });
    this.#fetch(this.#stream);
  }

  pause() {
    if (!this.#stream || !this.#stream.request) {
      return true;
    }
    this.#stream.request.abort();
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
