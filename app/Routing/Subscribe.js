export default stations => {
  return (command, message, ws, err) => {
    let stationId = message.toLowerCase();
    let station = stations.filter(s => s.id === stationId)[0];

    if (!station) {
      return err(ws, 404);
    }

    if (!ws.type) {
      ws.type = new Set();
    }
    ws.type.add(stationId);
    //Stats.add(ws.id, stationId);

    if (!station.isPlaying()) {
      station.play();
    }

    let tags = {
      [stationId]: station.getTags(true)
    };
    ws.send(JSON.stringify(tags));
  };
}
