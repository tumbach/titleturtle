export default stations => {
  return (command, message, ws, err) => {
    let [stationId, count] = message.toLowerCase().split(' ');
    let station = stations.filter(s => s.id === stationId)[0];
    if (!station) {
      return err(ws, 404);
    }
    ws.send(JSON.stringify(station.history.get(count)));
  };
}
