const http = require('http');
const https = require('https');
const packageJSON = require('../../package.json');

class HTTPRequester {

    #url;
    #options;

    constructor({url, timeout}) {
        this.#url = new URL(url);
        this.module = this._chooseModule();
        this.timeout = timeout ?? 30000;

        this.#options = {
            headers: {
                "User-Agent": "titleturtle/" + packageJSON.version,
            },
            timeout: this.timeout
        };
    }

    _chooseModule() {
        return (this.#url.protocol === 'https:')
            ? https
            : http;
    }

    async request() {
        return new Promise(async (resolve, reject) => {
            let req = this.stream();
            req.on('error', e => {
                return reject(e);
            });
            return resolve(await this.requestAll(req).catch(reject));
        });
    }

    stream(options = {}) {
        let opts = this.#options;
        opts.headers = Object.assign(opts.headers, options.headers);
        let req = this.module.get(this.#url, opts);
        req.on('timeout', () => {
            req.destroy(new Error('Custom socket timeout'));
        });
        req.on('socket', socket => {
            let listeners = socket.listeners('data');
            if (listeners.length) {
                socket.removeAllListeners('data');
                socket.on('data', onData);
            } else {
                throw new Error('should not happen...'); // never?
            }

            let that = this;
            function onData(data) {
                let chunk = that.onIcyData(data);

                socket.removeListener('data', onData);
                listeners.forEach(listener => {
                    socket.on('data', listener);
                });
                listeners = null;
                socket.emit('data', chunk);
            }

        })
        return req;
    }

    onIcyData(buffer) {
        if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'ICY ') {
            buffer = Buffer.concat([Buffer.from('HTTP/1.0 ', 'ascii'), buffer.slice(4)]);
        }
        return buffer;
    }

    requestAll(req) {
        return new Promise((resolve, reject) => {
            let timeout = setTimeout(() => {
                let e = new Error('Custom connection timeout');
                req.destroy(e);
                reject(e);
            }, this.timeout);
            req.on('response', res => {
                clearTimeout(timeout);
                let out = '';
                res.on('data', data => {
                    out += data;
                });
                res.on('end', () => {
                    resolve({
                        status: http.STATUS_CODES[res.statusCode],
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: out
                    });
                    out = null;
                })
            });
        });
    }

}

module.exports = HTTPRequester;
