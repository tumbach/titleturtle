const config = require('./helpers/config');
const event = require('./helpers/event');
const TagsParser = require('./TagsParser');
const output = require('./helpers/output');
const WebsocketServer = require('./WebsocketServer');

config.set(`currentTags`, []);
config.set(`instances`, []);

let stations = config('stations', []);
if (!stations.length) {
  console.log('Empty config! Please, copy an example (./config.js.example) and change it.');
}

stations.map(instance => {
  config.set(`currentTags.${instance.id}`, {});
  config.set(`instances.${instance.id}`, new TagsParser(instance));

  if(!config('server.websocket.enable')) {
    event.on(`${instance.id}.update`, input => {
      config.set(`currentTags.${input.station}`, output(input));
    });
  }
});


if(config('server.websocket.enable')) {
  console.log('Starting WS...');
  WebsocketServer.init();
}
