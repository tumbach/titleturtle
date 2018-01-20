const config = require('./helpers/config');
const event = require('./helpers/event');
const Websocket = require('./helpers/ws');
const Stats = require('./Stats');

const WSInstance = Websocket(undefined, config('server.websocket.port', 8080));

let lazyMode = (station) => {
  let instances = config('instances');
  if (!station || !Stats.online()) {
    for (let instance in instances) {
      if (instances[instance].options.lazy) {
        instances[instance].pause();
      }
    }
    return true;
  }
  if (!Stats.get(station)) {
    if (instances[station].options.lazy) {
      instances[station].pause();
    }
  }
};


module.exports.init = () => {
  let instances = config('instances');
  for (let instance in instances) {
    event.on(`${instance}.update`, (input) => {
      let tags = {};
      let output = config.get('output')(input);
      config.set(`currentTags.${input.station}`, output);
      tags[input.station] = output;
      WSInstance.broadcast(JSON.stringify(tags), input.station);
    });
  }

  [`stats.online`, `stats.offline`].map((type) => {
    event.on(type, () => {
      WSInstance.broadcast(JSON.stringify(Stats.get()), 'stats');
    });
  });

  this.middlewares.map(([command, func]) => {
    WSInstance.use(command, func);
  });
};

module.exports.middlewares = [
  ["SBCR", (command, message, ws, err) => {
    let exists = false;
    let instances = config('instances');
    message = message.toLowerCase();
    for (let instance in instances) {
      if (instance === message) {
        exists = true;
      }
    }
    if (!exists) {
      return err(ws, 404);
    }
    if (!ws.type) {
      ws.type = new Set();
    }
    ws.type.add(message);
    Stats.add(ws.id, message);

    if (instances[message].paused) {
      instances[message].resume();
    }

    let currentTags = config('currentTags');
    currentTags[message].now = Math.floor(+new Date / 1000);
    let tags = {};
    tags[message] = currentTags[message];
    ws.send(JSON.stringify(tags));
  }],
  ["UNSB", (command, message, ws, err) => {
    message = message.toLowerCase();
    ws.type.delete(message);
    Stats.remove(ws.id, message);
    lazyMode(message);

    let tags = {};
    tags[message] = null;
    ws.send(JSON.stringify(tags));
  }],
  ["STATS", (command, message, ws, err) => {
    if (!ws.type) {
      ws.type = new Set();
    }
    if (message.toLowerCase().indexOf('sbcr') === 0) {
      ws.type.add('stats');
      return ws.send(JSON.stringify(Stats.get()));
    } else if (message.toLowerCase().indexOf('unsb') === 0) {
      return ws.type.delete('stats');
    }
    ws.send(JSON.stringify(Stats.get(message)));
  }]
];
