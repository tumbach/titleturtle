const config = require('./helpers/config.js');
const event = require('./helpers/event.js');
const Stats = require('./Stats.js');
const TagsParser = require('./TagsParser.js');
const WebsocketServer = require('./WebsocketServer.js');
const History = require('./History.js');

let instances = {};

let stations = config('stations', []);
if (!stations.length) {
  console.log('Empty config! Please, copy an example (./config.js.example) and change it.');
  process.exit(0);
}

stations.forEach((station, index) => {
  let { id: stationId } = station;
  instances[stationId] = new TagsParser(station);
  instances[stationId].currentTags = {};
  instances[stationId].history = new History(config(`stations.${index}.historyLength`, config('historyLength')));
});

if (config('server.websocket.enable')) {
  console.log('Starting WS...');
  let lazyMode = stationId => {
      if (!stationId || !Stats.online()) {
        Object.keys(instances)
          .filter(stationId => instances[stationId].options.lazy)
          .forEach(stationId => instances[stationId].pause());
        return true;
      }
      if (!Stats.get(stationId)) {
        if (instances[stationId].options.lazy) {
          instances[stationId].pause();
        }
      }
    };

  let middlewares = {
    "SUB": (command, message, ws, err) => {
      let exists = false;
      let stationId = message.toLowerCase();
      if (stationId in instances) {
        exists = true;
      }
      if (!exists) {
        return err(ws, 404);
      }
      if (!ws.type) {
        ws.type = new Set();
      }
      ws.type.add(stationId);
      Stats.add(ws.id, stationId);

      if (instances[stationId].paused) {
        instances[stationId].resume();
      }

      instances[stationId].currentTags.now = Math.floor(+new Date / 1000);
      let tags = {};
      tags[stationId] = instances[stationId].currentTags;
      ws.send(JSON.stringify(tags));
    },
    "UNSUB": (command, message, ws, err) => {
      message = message.toLowerCase();
      ws.type.delete(message);
      Stats.remove(ws.id, message);
      lazyMode(message);

      let tags = {};
      tags[message] = null;
      ws.send(JSON.stringify(tags));
    },
    "STATS": (command, message, ws, err) => {
      if (!ws.type) {
        ws.type = new Set();
      }
      if (message.toUpperCase().includes('sub', 0)) {
        ws.type.add('stats');
        return ws.send(JSON.stringify(Stats.get()));
      } else if (message.toUpperCase().includes('unsub', 0)) {
        return ws.type.delete('stats');
      }
      ws.send(JSON.stringify(Stats.get(message)));
    },
    "HISTORY": (command, message, ws, err) => {
      let [stationId, count] = message.toLowerCase().split(' ');
      let station = instances[stationId];
      if (!station) {
        return err(ws, 404);
      }
      ws.send(JSON.stringify(station.history.get(count)));
    }
  };

  let WSInstance = WebsocketServer.init(middlewares);

  for (let stationId in instances) {
    event.on(`station.${stationId}.update`, input => {
      let { currentTags, history } = instances[stationId];
      if (Object.keys(currentTags).length) {
        delete currentTags.now;
        history.add(currentTags);
      }

      if (!input.error) {
        let output = config('output')(input);
        instances[stationId].currentTags = output;

        let tags = {};
        tags[stationId] = output;
        WSInstance.broadcast(tags, stationId);
      }
    });
  }

  [`stats.online`, `stats.offline`].forEach(type => {
    event.on(type, () => WSInstance.broadcast(Stats.get(), 'stats'));
  });
} else {
  for (let stationId in instances) {
    event.on(`station.${stationId}.update`, input => {
      instances[stationId].currentTags = config('output')(input);
    });
  }
}
