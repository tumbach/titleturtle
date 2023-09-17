import config from "../config.js";
import Websocket from "./helpers/ws.js";

const WSInstance = Websocket(undefined, config.server.websocket.port, 8080);

export function init(middlewares = {}) {
  Object.keys(middlewares).forEach((command) => WSInstance.use(command, middlewares[command]));
  return WSInstance;
}

export default { init };
