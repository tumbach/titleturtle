let icy = require('icy');
const { URL } = require('url');

let streamUrl = new URL('http://tumba.ch:8000/stream');
//let streamUrl = 'https://station.waveradio.org/provodach.mp3';

icy.get(streamUrl, (res) => {

  res.on('metadata', function (metadata) {
    let parsed = icy.parse(metadata);
    console.error(parsed);
    res.resume();
  });

  res.on('error', e => {
    console.log(e);
  });

});
