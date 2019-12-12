const Figurecon = require('figurecon');

module.exports = new Figurecon(__dirname + '/../../config.js', {
  output: ({station, artist, title, date} = {}) => {
    return {
      artist,
      title,
      date: Math.floor(+date / 1000),
      now: Math.floor(+new Date / 1000)
    };
  }
});
