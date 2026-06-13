import { Events, Interaction, ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction } from 'discord.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    console.log('🔔 Interaction reçue:', interaction.type);

    // Routeur principal des interactions
    if (interaction.isChatInputCommand()) {
      return handleCommand(interaction);
    }

    if (interaction.isButton()) {
      return handleButton(interaction);
    }

    if (interaction.isStringSelectMenu()) {
      return handleSelectMenu(interaction);
    }

    if (interaction.isModalSubmit()) {
      return handleModal(interaction);
    }

    if (interaction.isAutocomplete()) {
      return handleAutocomplete(interaction);
    }

    console.log('⏭️ Interaction ignorée (type non géré)');
  },
};

async function handleCommand(interaction: any) {
  console.log(`📝 Commande exécutée: ${interaction.commandName} par ${interaction.user.tag}`);

  const client = interaction.client as any;
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`❌ Commande ${interaction.commandName} non trouvée`);
    return;
  }

  try {
    await command.execute(interaction);
    console.log(`✅ Commande ${interaction.commandName} exécutée avec succès`);
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution de la commande ${interaction.commandName}:`, error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'Une erreur est survenue lors de l\'exécution de cette commande!',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: 'Une erreur est survenue lors de l\'exécution de cette commande!',
        ephemeral: true
      });
    }
  }
}

async function handleButton(interaction: ButtonInteraction) {
  const customId = interaction.customId;
  console.log(`🔘 Bouton cliqué: ${customId} par ${interaction.user.tag}`);

  // Routeur de boutons
  const parts = customId.split('_');

  // Pagination
  if (customId.startsWith('page_')) {
    return handlePaginationButton(interaction, parts[1]);
  }

  // Combat
  if (customId.startsWith('combat_')) {
    return handleCombatButton(interaction, parts);
  }

  // Marchand
  if (customId.startsWith('merchant_')) {
    return handleMerchantButton(interaction, parts);
  }

  // Invasions
  if (customId.startsWith('invasion_')) {
    return handleInvasionButton(interaction, parts);
  }

  console.log(`⏭️ Bouton non géré: ${customId}`);
}

async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  const customId = interaction.customId;
  console.log(`📋 Select menu: ${customId} par ${interaction.user.tag}`);

  // Routeur de select menus
  if (customId.startsWith('combat_swap_select_')) {
    return handleCombatSwap(interaction);
  }

  if (customId.startsWith('merchant_select_')) {
    return handleMerchantPurchase(interaction);
  }

  console.log(`⏭️ Select menu non géré: ${customId}`);
}

async function handleModal(interaction: ModalSubmitInteraction) {
  const customId = interaction.customId;
  console.log(`📝 Modal soumis: ${customId} par ${interaction.user.tag}`);

  // Routeur de modals
  if (customId.startsWith('report_')) {
    return handleReportModal(interaction);
  }

  console.log(`⏭️ Modal non géré: ${customId}`);
}

async function handleAutocomplete(interaction: any) {
  const commandName = interaction.commandName;
  console.log(`💡 Autocomplete pour: ${commandName}`);

  const client = interaction.client as any;
  const command = client.commands.get(commandName);

  if (!command || !command.autocomplete) {
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    console.error(`❌ Erreur autocomplete ${commandName}:`, error);
  }
}

// Handlers spécifiques (à implémenter)
async function handlePaginationButton(interaction: ButtonInteraction, action: string): Promise<void> {
  // TODO: Implémenter handler pagination
  console.log(`Pagination: ${action}`);
}

async function handleCombatButton(interaction: ButtonInteraction, parts: string[]): Promise<void> {
  const action = parts[1];
  const sessionId = parts[2];

  // TODO: Implémenter handler combat
  console.log(`Combat: ${action} session ${sessionId}`);
}

async function handleCombatSwap(interaction: StringSelectMenuInteraction): Promise<void> {
  // TODO: Implémenter handler swap combat
  console.log('Combat swap');
}

async function handleMerchantButton(interaction: ButtonInteraction, parts: string[]): Promise<void> {
  // TODO: Implémenter handler marchand
  console.log('Merchant button');
}

async function handleMerchantPurchase(interaction: StringSelectMenuInteraction): Promise<void> {
  // TODO: Implémenter handler achat marchand
  console.log('Merchant purchase');
}

async function handleInvasionButton(interaction: ButtonInteraction, parts: string[]): Promise<void> {
  // TODO: Implémenter handler invasion
  console.log('Invasion button');
}

async function handleReportModal(interaction: ModalSubmitInteraction): Promise<void> {
  // TODO: Implémenter handler report
  console.log('Report modal');
}
