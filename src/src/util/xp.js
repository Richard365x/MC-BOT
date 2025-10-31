// XP helpers
const { XP } = require('./ids.js');
function xpForRank(rankKey){
  const key = String(rankKey || '').toUpperCase();
  if (['E','D','C','B','A','S','APEX'].includes(key)) return XP[key];
  return 0;
}
module.exports = { xpForRank };