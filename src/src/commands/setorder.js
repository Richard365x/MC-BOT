const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ids = require('../util/ids.js');

const DATA = path.join(__dirname, '..', '..', 'data', 'order.json');
function load(){ try { return JSON.parse(fs.readFileSync(DATA,'utf8')); } catch { return { season:'A', A: [], B: []}; } }
function save(v){ fs.writeFileSync(DATA, JSON.stringify(v,null,2)); }

function isStaff(member){
  return member.id === ids.OWNER_ID || member.roles.cache.has(ids.ROLES.LEAGUE_DIRECTOR);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setorder')
    .setDescription('Set or rotate gym order (Owner/League Director only).')
    .addStringOption(o => o.setName('season').setDescription('A or B').setRequired(true).addChoices({name:'A',value:'A'},{name:'B',value:'B'}))
    .addStringOption(o => o.setName('order').setDescription('Comma list of types, e.g., WATER,FIRE,GRASS').setRequired(true)),
  async execute(interaction){
    const member = interaction.member;
    if (!isStaff(member)) return interaction.reply({ content: 'Only Owner or League Director.', ephemeral: true });
    const season = interaction.options.getString('season');
    const order = interaction.options.getString('order').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const invalid = order.filter(k => !ids.TYPES[k]);
    if (invalid.length) return interaction.reply({ content: `Invalid types: ${invalid.join(', ')}`, ephemeral: true });
    const state = load();
    state[season] = order;
    state.season = season;
    save(state);
    return interaction.reply({ content: `Order for season ${season} saved: ${order.join(' → ')}`, ephemeral: true });
  }
};