export default stations => {
  return (command, message, ws, err) => {
    if (!stations) {
      return err(ws, 404);
    }
    ws.send(JSON.stringify(stations.map(stationOutputForAPI)));
  };
}

function stationOutputForAPI(station) {
  return {
    id: station.id,
    name: station.name,
    playlist: station.playlist,
    tags: station.tags || [],
  }
}
