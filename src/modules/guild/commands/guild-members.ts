import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User, Guild } from '../../../database/models/index.js';
import { guildService } from '../../../services/GuildService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('guild-members')
    .setDescription('Voir les membres de votre guilde'),

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

      if (!guild) {
        await interaction.editReply({
          content: 'Guilde introuvable.'
        });
        return;
      }

      const members = await guildService.getGuildMembers(guild._id.toString());

      const embed = new EmbedBuilder()
        .setTitle(`👥 Membres de ${guild.name}`)
        .setDescription(`${members.length} membre(s)`)
        .setColor(0x0099FF)
        .setTimestamp();

      const masters = members.filter(m => m.role === 'leader');
      const officers = members.filter(m => m.role === 'officer');
      const regularMembers = members.filter(m => m.role === 'member');

      if (masters.length > 0) {
        embed.addFields({
          name: '👑 Master',
          value: masters.map(m => `<@${m.userId}>`).join(', ') || 'Aucun',
          inline: false
        });
      }

      if (officers.length > 0) {
        embed.addFields({
          name: '⭐ Officers',
          value: officers.map(m => `<@${m.userId}>`).join(', ') || 'Aucun',
          inline: false
        });
      }

      if (regularMembers.length > 0) {
        embed.addFields({
          name: '👤 Membres',
          value: regularMembers.map(m => `<@${m.userId}>`).join(', ') || 'Aucun',
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la récupération des membres:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la récupération des membres.'
      });
    }
  }
};
