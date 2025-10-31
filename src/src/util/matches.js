const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', '..', 'data', 'matches.json');

function load(){
  try { return JSON.parse(fs.readFileSync(DATA,'utf8')); } catch { return {}; }
}
function save(state){
  fs.writeFileSync(DATA, JSON.stringify(state, null, 2));
}
function upsert(match){
  const state = load();
  state[match.id] = match;
  save(state);
}
function remove(id){
  const state = load();
  delete state[id];
  save(state);
}
function all(){ return load(); }

module.exports = { load, save, upsert, remove, all, DATA };