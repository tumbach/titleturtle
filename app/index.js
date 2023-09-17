import { globalAgent } from "node:https";
import {create} from "ssl-root-cas";

import Config from "../config.js";
import Station from "./Station.js";
import WebsocketServer from "./WebsocketServer.js";
import History from "./History.js";

import SubscribeRoute from "./Routing/Subscribe.js";
import UnsubscribeRoute from "./Routing/Unsubscribe.js";
import HistoryRoute from "./Routing/History.js";
import StationsRoute from "./Routing/Stations.js";
import UptimeRoute from "./Routing/Uptime.js";

const rootCas = create();
globalAgent.options.ca = rootCas;

if (!Config.stations.length) {
  console.log('Empty config! Please, copy an example (./config.js.example) and change it.');
  process.exit(0);
}

(async () => {
  let timestamp = Station.now();

  let stations = Config.stations.map(async s => { // { id, name, playlist, historyLength, historyTtl }
    let station = new Station(s);

    if (await station.getPlaylist()) {
      let historyLength = s.historyLength || Config.historyLength;
      let historyTtl = s.historyTtl || Config.historyTtl;
      station.history = new History(historyLength, historyTtl);
      station.onTagUpdate(tags => {
        station.history.add(tags);
      });
      station.play();
    }

    return station;
  });
  stations = await Promise.all(stations);

  if (Config.server.websocket.enable) {
    let middlewares = {
      "SUB": SubscribeRoute(stations),
      "UNSUB": UnsubscribeRoute,
      "HISTORY": HistoryRoute(stations),
      "STATIONS": StationsRoute(stations),
      "UPTIME": UptimeRoute(stations, timestamp, Station.now)
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
