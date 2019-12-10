const config = require('./helpers/config.js');
const Websocket = require('./helpers/ws.js');

const WSInstance = Websocket(undefined, config('server.websocket.port', 8080));

module.exports.init = (middlewares = []) => {
  Object.keys(middlewares).forEach((command) => WSInstance.use(command, middlewares[command]));
  return WSInstance;
};
