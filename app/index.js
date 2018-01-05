const config = require('./helpers/config');
const event = require('./helpers/event');
const TagsParser = require('./TagsParser');
const WebsocketServer = require('./WebsocketServer');

let output = ({station, artist, title, date}) => {
  //console.log(`[${station}] ${date}: ${artist} - ${title}`);
  return {
    artist: artist,
    title: title,
    date: Math.floor(+date / 1000)
  };
};
config.set('output', output);
config.set(`currentTags`, []);
config.set(`instances`, []);


config('stations', []).map((instance) => {
  event.on(`${instance.id}.update`, (input) => {
    config.set(`currentTags.${input.station}`, output(input));
  });
  config.set(`instances.${instance.id}`, new TagsParser(instance));
});


if(config('server.websocket')) {
  console.log('Starting WS...');
  WebsocketServer.init();
}
