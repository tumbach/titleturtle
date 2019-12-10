const event = require('./helpers/event');

let Stats = module.exports = {};

let online = [];
let listen = {};

Stats.online = id => {
  if (!id) {
    return online.length;
  }
  if (!online.includes(id)) {
    //console.log(`Meeeeow! ${id} is catching tags!`);
    online.push(id);
  }
};

Stats.offline = id => {
  if (!id) {
    return online.length;
  }
  if (!online.includes(id)) {
    return;
  }
  //console.log(`Woooo... ${id} left.`);

  for (let station in listen) {
    let index = listen[station].indexOf(id);
    if (index > -1) {
      listen[station].splice(index, 1);
    }
  }

  let index = online.indexOf(id);
  return online.splice(index, 1);
};

Stats.add = (id, stationId) => {
  //console.log(`Tutturu! ${id} is on ${stationId}!`);
  return listen[stationId].push(id);
};

Stats.remove = (id, stationId) => {
  //console.log(`Meeeh... ${id} left ${stationId}.`);
  let index = listen[stationId].indexOf(id);
  return listen[stationId].splice(index, 1);
};

Stats.init = stationId => {
  if (typeof listen[stationId] === 'undefined') {
    listen[stationId] = [];
    return true;
  }
  return false;
};

for (let func in Stats) {
  event.on(`stats.${func}`, Stats[func]);
}

Stats.get = stationId => {
  let out = {};
  if (typeof listen[stationId] !== 'undefined') {
    out[stationId] = listen[stationId].length;
  } else if (stationId === 'all') {
    let total = 0;
    for (let station in listen) {
      total += (out[stationId] = listen[stationId].length);
    }
    out.total = total;
  } else {
    out = {
      online: online.length
    }
  }
  return out;
};
