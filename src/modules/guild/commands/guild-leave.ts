import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User, Guild } from '../../../database/models/index.js';
import { guildService } from '../../../services/GuildService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('guild-leave')
    .setDescription('Quitter votre guilde actuelle'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: 'Vous devez d\'abord commencer votre aventure avec `/commencer`!'
        });
        return;
      }

      if (!user.guildId) {
        await interaction.editReply({
          content: 'Vous n\'êtes pas dans une guilde.'
        });
        return;
      }

      const guild = await Guild.findById(user.guildId);

      const result = await guildService.leaveGuild(user);

      if (!result.success) {
        await interaction.editReply({
          content: result.error || 'Erreur lors de la quitter la guilde.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('👋 Guilde Quittée')
        .setDescription(guild ? `Vous avez quitté la guilde **${guild.name}**` : 'Vous avez quitté votre guilde')
        .setColor(0xFF9900)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la quitter la guilde:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la quitter la guilde.'
      });
    }
  }
};
