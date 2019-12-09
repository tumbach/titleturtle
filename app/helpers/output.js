module.exports = ({station, artist, title, date}) => {

  console.log(`[${station}] ${date}: ${artist} - ${title}`);

  return {
    artist,
    title,
    date: Math.floor(+date / 1000),
    now: Math.floor(+new Date / 1000)
  };
};
