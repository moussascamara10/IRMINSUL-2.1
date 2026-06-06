import { Events, Interaction } from 'discord.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    console.log('🔔 Interaction reçue:', interaction.type);
    
    if (!interaction.isChatInputCommand()) {
      console.log('⏭️ Interaction ignorée (pas une commande chat)');
      return;
    }

    console.log(`📝 Commande exécutée: ${interaction.commandName} par ${interaction.user.tag}`);
    
    const client = interaction.client as any;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`❌ Commande ${interaction.commandName} non trouvée`);
      return;
    }

    console.log(`✅ Commande trouvée, début de l'exécution...`);
    
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
  },
};
