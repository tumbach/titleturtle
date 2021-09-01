const Config = require('../config.js');
const Station = require('./Station.js');
const WebsocketServer = require('./WebsocketServer.js');
const History = require('./History.js');

if (!Config.stations.length) {
  console.log('Empty config! Please, copy an example (./config.js.example) and change it.');
  process.exit(0);
}

(async () => {
  let stations = Config.stations.map(async s => { // { id, name, playlist, historyLength, historyTtl }
    let station = new Station(s);

    if (await station.getPlaylist()) {
      let historyLength = s.historyLength || Config.historyLength;
      let historyTtl = s.historyTtl || Config.historyTtl;
      station.history = new History(historyLength, historyTtl);
      station.onTagUpdate(tags => {
        station.history.add(tags);
        console.log(station.id, tags);
      });
      station.play();
    }

    return station;
  });
  stations = await Promise.all(stations);

  if (Config.server.websocket.enable) {
    let middlewares = {
      "SUB": require('./Routing/Subscribe.js')(stations),
      "UNSUB": require('./Routing/Unsubscribe.js'),
      "HISTORY": require('./Routing/History.js')(stations)
    };
    let WSInstance = WebsocketServer.init(middlewares);
    for (let station of stations) {
      station.onTagUpdate(tags => {
        WSInstance.broadcast({
          [station.id]: tags
        }, station.id);
      });
    }
  }
})();
