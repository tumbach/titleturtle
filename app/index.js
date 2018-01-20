const config = require('./helpers/config');
const TagsParser = require('./TagsParser');
const WebsocketServer = require('./WebsocketServer');

let output = ({station, artist, title, date}) => {
  //console.log(`[${station}] ${date}: ${artist} - ${title}`);
  return {
    artist: artist,
    title: title,
    date: Math.floor(+date / 1000),
    now: Math.floor(+new Date / 1000)
  };
};
config.set('output', output);
config.set(`currentTags`, []);
config.set(`instances`, []);


config('stations', []).map((instance) => {
  config.set(`currentTags.${instance.id}`, {});
  config.set(`instances.${instance.id}`, new TagsParser(instance));
});


if(config('server.websocket.enable')) {
  console.log('Starting WS...');
  WebsocketServer.init();
}
