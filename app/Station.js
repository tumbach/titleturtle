import {IcecastMetadataStream} from "icecast-metadata-js";
import {writableNoopStream as devNull} from "noop-stream";
import {decode} from "html-entities";

import event from "./helpers/event.js";
import HTTPRequester from "./helpers/HTTPRequester.js";

export default class Station {

  static SEPARATOR = ' - ';

  #endpoint;
  #playlistURL;
  #stream;
  #timeout = null;
  tags = {};
  playlist = [];
  timestamp = null;

  constructor({id, name, playlist}) {
    this.id = id;
    this.name = name;
    this.#playlistURL = playlist;

    event.on(`${this.id}.connect`, () => {
      console.log(`[${this.id}] Connected to ${this.#endpoint}`);
    });
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
      artist: tags?.artist.trim() || null,
      title: tags?.title.trim() || null,
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
          return this.reconnect(30e3, `Error ${statusCode}`);
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
        icecast.metadata.on('data', data => {
          let tags = Station.parseTags(data);
          this.setTags(tags);
        });
        icecast.metadata.on('error', e => {
          this.reconnect(30e3, e);
        });
        icecast.on('pipe', () => {
          this.timestamp = Station.now();
          event.emit('connect', this.id);
          event.emit(`${this.id}.connect`);
        })
        response.on('close', () => {
          this.reconnect(5e3, "Connection was closed");
        });
        response.pipe(icecast);
        icecast.stream.pipe(devNull());
        icecast.metadata.pipe(devNull({objectMode: true}));
      });
      stream.on('timeout', e => {
        this.reconnect(10e3, e);
      });
      stream.on('error', e => {
        this.reconnect(20e3, e);
      });
    } catch (err) {
      this.reconnect(30e3, err);
    }
  }

  reconnect(ms = 30e3, e) {
    clearTimeout(this.#timeout);
    this.timestamp = null;
    e && console.error(`[${this.id}]`, e);
    if (!Object.keys(this.tags).length) {
      console.log(`[${this.id}] Reconnect is not needed: no tags were fetched. (${this.#endpoint})`);
      return false;
    }
    console.log(`[${this.id}] Reconnect in ${ms} ms. (${this.#endpoint})`);
    this.pause();
    this.#timeout = setTimeout(() => {
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

  static parseTags({metadata/*, time*/}) {
    let tags = {
      artist: metadata.ARTIST || null,
      title: metadata.TITLE || null
    }

    if (metadata.StreamTitle) {
      let [artist, ...title] = metadata.StreamTitle.split(Station.SEPARATOR);
      tags.artist = artist;
      tags.title = title.join(Station.SEPARATOR);
    }

    return {
      artist: decode(tags.artist, {scope: 'strict'}),
      title: decode(tags.title, {scope: 'strict'}),
    }
  }

  static now() {
    return Math.floor(+new Date() / 1e3);
  }

};
