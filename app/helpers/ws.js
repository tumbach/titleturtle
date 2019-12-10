const WebSocket = require('ws');
const event = require('./event.js');

let instance;

class WS {
  constructor ({server, port}) {
    this.handlers = [];
    this.instance = new WebSocket.Server({
      server,
      port,
      path: '/ws'
    });

    this.instance.on('connection', ws => {
      ws.isAlive = true;
      ws.id = (Math.floor(Math.random() * 0xFFFF)).toString(16).toUpperCase();

      event.emit('stats.online', ws.id);

      ws.on('pong', () => {
        ws.isAlive = true;
      });
      ws.on('message', message => {
        this.onMessage(message, ws);
      });
      ws.on('close', () => {
        event.emit('stats.offline', ws.id);
      });
    });

    this.interval = setInterval(() => {
      for (let client of this.instance.clients) {
        if (!client.isAlive) {
          event.emit('stats.offline', client.id);
          return client.terminate();
        }
        client.isAlive = false;
        client.ping('NUS', false, true);
      }
    }, 30000);
  }

  use (command, handler) {
    if (!this.handlers[command]) {
      this.handlers[command] = [];
    }
    this.handlers[command].push(handler);
  }

  broadcast (data, type) {
    for (let client of this.instance.clients) {
      if (data instanceof Object) {
        data = JSON.stringify(data);
      }

      if (client.readyState === WebSocket.OPEN) {
        if (type && client.type && client.type.has(type)) {
          client.send(data);
        }
      }
    }
  }

  onMessage (message, ws) {
    message = message.trim().split(' ');
    let command = message.shift().toUpperCase();
    message = message.join(' ');

    let sequence = this.handlers[command];
    if (!sequence) {
      return this.throw(ws, 404);
    }
    sequence = sequence.slice();

    function solveMiddleware(command, message, ws, err) {
      if (!sequence.length) {
        return;
      }
      let fn = sequence.shift();

      function next() {
        solveMiddleware(command, message, ws, err);
      }
      fn(command, message, ws, err, next);
    }

    solveMiddleware(command, message, ws, this.throw);
  }

  throw (ws, code, err) {
    let out = 'FAIL ';
    out += (code)
      ? code
      : 500;
    if (err) out += ' #' + err;
    ws.send(out);
  }
}

module.exports = (server, port) => {
  if (!instance) {
    instance = new WS({
      server,
      port
    });
  }
  return instance;
};
