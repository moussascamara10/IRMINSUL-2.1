import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } from 'discord.js';
import { User } from '../../../database/models/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('expedition')
    .setDescription('Gère vos expéditions')
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Action')
        .setRequired(true)
        .addChoices(
          { name: 'Voir les expéditions', value: 'view' },
          { name: 'Démarrer une expédition', value: 'start' },
          { name: 'Récupérer les récompenses', value: 'claim' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const action = interaction.options.getString('action')!;
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: '❌ Vous devez d\'abord commencer votre aventure avec `/commencer`!\n\n💡 Utilisez `/commencer` pour créer votre profil et recevoir vos ressources de départ.'
        });
        return;
      }

      // Vérifier si l'utilisateur a atteint AR 15 pour accéder aux expéditions
      if (user.adventureRank < 15) {
        await interaction.editReply({
          content: `❌ Vous devez atteindre le Rang Aventurier 15 pour accéder aux expéditions!\n\n💡 Votre AR actuel : ${user.adventureRank}\n💡 AR requis : 15\n\n💡 Utilisez \`/guide\` pour des conseils sur comment progresser.`
        });
        return;
      }

      if (action === 'view') {
        // Afficher les expéditions actuelles
        const embed = new EmbedBuilder()
          .setTitle('🗺️ Vos Expéditions')
          .setColor(0x0099FF)
          .setDescription('Vous avez 5 emplacements d\'expédition')
          .addFields(
            { name: 'Emplacement 1', value: 'Aucune expédition en cours', inline: true },
            { name: 'Emplacement 2', value: 'Aucune expédition en cours', inline: true },
            { name: 'Emplacement 3', value: 'Aucune expédition en cours', inline: true },
            { name: 'Emplacement 4', value: 'Aucune expédition en cours', inline: true },
            { name: 'Emplacement 5', value: 'Aucune expédition en cours', inline: true }
          )
          .setFooter({ text: 'Utilisez /expedition start pour démarrer une expédition' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } else if (action === 'start') {
        // Menu de sélection d'expédition
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('expedition_select')
          .setPlaceholder('Choisis une expédition')
          .addOptions(
            { label: 'Expédition Mondstadt (4h)', value: 'mondstadt_4', description: '500 Mora, 2 XP Aventurier' },
            { label: 'Expédition Mondstadt (8h)', value: 'mondstadt_8', description: '1000 Mora, 4 XP Aventurier' },
            { label: 'Expédition Mondstadt (12h)', value: 'mondstadt_12', description: '1500 Mora, 6 XP Aventurier' },
            { label: 'Expédition Mondstadt (20h)', value: 'mondstadt_20', description: '2500 Mora, 10 XP Aventurier' },
            { label: 'Expédition Liyue (4h)', value: 'liyue_4', description: '1000 Mora, 3 XP Aventurier' },
            { label: 'Expédition Liyue (8h)', value: 'liyue_8', description: '2000 Mora, 6 XP Aventurier' },
            { label: 'Expédition Liyue (12h)', value: 'liyue_12', description: '3000 Mora, 9 XP Aventurier' },
            { label: 'Expédition Liyue (20h)', value: 'liyue_20', description: '5000 Mora, 15 XP Aventurier' }
          );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
          .addComponents(selectMenu);

        await interaction.editReply({
          content: 'Choisis une expédition à démarrer:',
          components: [row]
        });

        // TODO: Gérer la sélection
        const collector = interaction.channel?.createMessageComponentCollector({
          componentType: ComponentType.StringSelect,
          time: 60000
        });

        collector?.on('collect', async (i) => {
          if (i.user.id !== discordId) {
            await i.reply({ content: 'Ce n\'est pas votre sélection!', ephemeral: true });
            return;
          }

          await i.update({ content: 'Expédition démarrée! (Fonctionnalité en développement)' });
        });

      } else if (action === 'claim') {
        // Récupérer les récompenses
        const embed = new EmbedBuilder()
          .setTitle('🎁 Récompenses d\'Expédition')
          .setColor(0x00FF00)
          .setDescription('Aucune expédition terminée à récupérer')
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Erreur lors de la gestion des expéditions:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la gestion des expéditions.'
      });
    }
  }
};
