import { challengeHandler } from './commands/challenge.js';
import { resultHandler } from './commands/result.js';
import { setOrderHandler } from './commands/setorder.js';
import { cancelHandler } from './commands/cancel.js';

export async function handleInteraction(interaction, client) {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  if (commandName === 'challenge') return challengeHandler(interaction, client);
  if (commandName === 'result') return resultHandler(interaction, client);
  if (commandName === 'set-order') return setOrderHandler(interaction, client);
  if (commandName === 'cancel') return cancelHandler(interaction, client);
}
