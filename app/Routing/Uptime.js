export default (stations, timestamp, now) => {
  return (command, message, ws, err) => {
    let stationId = message.toLowerCase();
    if (!stationId) {
      let uptime = getGlobalUptime(timestamp, now);
      return sendUptime(uptime, null, ws);
    }

    let station = stations.find(station => station.id === stationId);
    if (!station) { // not found
      return err(ws, 404);
    }

    let uptime = getStationUptime(station, now);
    return sendUptime(uptime, stationId, ws);
  };
}

function getGlobalUptime(timestamp, now) {
  return now() - timestamp;
}

function getStationUptime(station, now) {
  let timestamp = station.timestamp;
  if (!timestamp) { // disconnected
    return 0;
  }
  return now() - timestamp;
}

function sendUptime(uptime, stationId, ws) {
  if (stationId) {
    let out = {
      uptime: {
        [stationId]: uptime
      }
    };
    return ws.send(JSON.stringify(out));
  }

  let out = {
    uptime
  };
  return ws.send(JSON.stringify(out));
}
