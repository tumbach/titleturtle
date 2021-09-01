module.exports = (command, message, ws, err) => {
  message = message.toLowerCase();
  ws.type.delete(message);
  //Stats.remove(ws.id, message);
  // TODO: lazyMode

  let tags = {
    [message]: null
  };
  ws.send(JSON.stringify(tags));
};
