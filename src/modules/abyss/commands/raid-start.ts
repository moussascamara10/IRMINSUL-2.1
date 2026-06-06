import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { endgameService } from '../../../services/EndgameService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('raid-start')
    .setDescription('Démarrer un raid')
    .addStringOption(option =>
      option
        .setName('raid')
        .setDescription('Le raid à démarrer')
        .setRequired(true)
        .addChoices(
          { name: 'Dvalin le Stormterror', value: 'stormterror' },
          { name: 'Childe le Tsaritsa', value: 'childe' },
          { name: 'Azhdaha le Seigneur des Vishes', value: 'azhdaha' },
          { name: 'La Signora', value: 'signora' }
        )
    )
    .addStringOption(option =>
      option
        .setName('difficulty')
        .setDescription('La difficulté')
        .setRequired(true)
        .addChoices(
          { name: 'Normal', value: 'normal' },
          { name: 'Hard', value: 'hard' },
          { name: 'Extreme', value: 'extreme' },
          { name: 'Nightmare', value: 'nightmare' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const raidId = interaction.options.getString('raid')!;
    const difficulty = interaction.options.getString('difficulty')!;
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: 'Vous devez d\'abord commencer votre aventure avec `/commencer`!'
        });
        return;
      }

      const canAccess = endgameService.canAccessRaid(user, raidId);

      if (!canAccess) {
        await interaction.editReply({
          content: 'Vous ne pouvez pas accéder à ce raid. Vérifiez votre AR et World Level.'
        });
        return;
      }

      const raid = endgameService.getRaid(raidId);

      if (!raid) {
        await interaction.editReply({
          content: 'Raid introuvable.'
        });
        return;
      }

      // Créer une instance de raid (simplifiée pour l'instant)
      const instance = endgameService.createRaidInstance(raidId, [discordId], difficulty);

      const embed = new EmbedBuilder()
        .setTitle('⚔️ Raid Démarré!')
        .setDescription(`Vous avez lancé le raid **${raid.name}** en difficulté ${difficulty}`)
        .setColor(0xFF0000)
        .addFields(
          { name: 'Boss HP', value: `${instance.currentHP.toLocaleString()}/${instance.maxHP.toLocaleString()}`, inline: true },
          { name: 'Participants', value: instance.participants.length.toString(), inline: true },
          { name: 'Statut', value: instance.status, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors du démarrage du raid:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors du démarrage du raid.'
      });
    }
  }
};
