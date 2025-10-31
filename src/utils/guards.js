// src/utils/guards.js
// Friendly guardrails so bad inputs never crash the bot.

/** Fetch required string option. Replies ephemerally and returns null if missing. */
export function requireStringOpt(interaction, name, usageHint) {
  const v = interaction.options.getString(name, false);
  if (!v) {
    interaction.reply({ ephemeral: true, content: `Missing **${name}**. ${usageHint || ''}`.trim() });
    return null;
  }
  return v;
}

/** Prevent self-challenges. Returns true if blocked. */
export function forbidSelfChallenge(interaction, targetId) {
  if (interaction.user.id === targetId) {
    interaction.reply({ ephemeral: true, content: `You can’t challenge yourself. Pick a different opponent.` });
    return true;
  }
  return false;
}

/** True if member has any of the provided role IDs. */
export function memberHasAnyRole(member, roleIds) {
  return roleIds.some(id => member.roles.cache.has(id));
}

/** Simple global error net */
export function installGlobalErrorNet() {
  process.on('unhandledRejection', err => console.error('[UNHANDLED]', err));
  process.on('uncaughtException', err => console.error('[UNCAUGHT]', err));
}
