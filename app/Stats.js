const event = require('./helpers/event');

let Stats = module.exports = {};

let online = [];
let listen = {};

Stats.online = (id) => {
  if (!id) {
    return online.length;
  }
  if (online.indexOf(id) === -1) {
    //console.log(`Meeeeow! ${id} is catching tags!`);
    online.push(id);
  }
};

Stats.offline = (id) => {
  if (!id) {
    return online.length;
  }
  if (online.indexOf(id) === -1) {
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

Stats.add = (id, station) => {
  //console.log(`Tutturu! ${id} is on ${station}!`);
  if (!listen[station]) {
    listen[station] = [];
  }
  return listen[station].push(id);
};

Stats.remove = (id, station) => {
  //console.log(`Meeeh... ${id} left ${station}.`);
  let index = listen[station].indexOf(id);
  return listen[station].splice(index, 1);
};

Stats.init = (station) => {
  if (typeof listen[station] === 'undefined') {
    listen[station] = [];
    return true;
  }
  return false;
};

for (let func in Stats) {
  event.on(`stats.${func}`, Stats[func]);
}

Stats.get = (station) => {
  let out = {};
  if (typeof listen[station] !== 'undefined') {
    out[station] = listen[station].length;
  } else if (station === 'all') {
    let total = 0;
    for (let station in listen) {
      total += (out[station] = listen[station].length);
    }
    out.total = total;
  } else {
    out = {
      online: online.length
    }
  }
  return out;
};
