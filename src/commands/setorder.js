import { getConfig, saveConfig } from '../lib/config.js';

export async function setOrderHandler(interaction) {
  const cfg = getConfig();
  const me = interaction.member;

  const isOwner = interaction.user.id === cfg.ownerId;
  const isManager = me.roles.cache.some(r => cfg.permissions.orderManagers.includes(r.id));

  if (!isOwner && !isManager) {
    return interaction.reply({ content: 'Only Owner or League Director can set order.', ephemeral: true });
  }

  const orderCsv = interaction.options.getString('order', true);
  const names = orderCsv.split(',').map(s => s.trim()).filter(Boolean);
  cfg.seasonOrder = names;
  saveConfig(cfg);
  return interaction.reply({ content: `Season order updated: ${names.join(' → ')}`, ephemeral: true });
}
