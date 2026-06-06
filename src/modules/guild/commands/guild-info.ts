import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User, Guild } from '../../../database/models/index.js';
import { guildService } from '../../../services/GuildService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('guild-info')
    .setDescription('Voir les informations de votre guilde'),

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

      const config = guildService.getGuildConfig(guild.guildId);
      const members = await guildService.getGuildMembers(guild._id.toString());
      const availablePerks = guildService.getAvailablePerks(guild.guildId);

      const embed = new EmbedBuilder()
        .setTitle(`🏰 ${guild.name}`)
        .setDescription(guild.description || 'Aucune description')
        .setColor(0x0099FF)
        .addFields(
          { name: 'Niveau', value: guild.level.toString(), inline: true },
          { name: 'XP', value: guild.xp.toString(), inline: true },
          { name: 'Membres', value: `${guild.members}/${config?.maxMembers || 50}`, inline: true },
          { name: 'GuildCoins', value: guild.guildCoins.toString(), inline: true },
          { name: 'Trésorerie Mora', value: guild.treasury.mora.toString(), inline: true },
          { name: 'Trésorerie Primogens', value: guild.treasury.primogens.toString(), inline: true }
        )
        .addFields(
          { name: 'Master', value: guild.roles.master.length.toString(), inline: true },
          { name: 'Officers', value: guild.roles.officer.length.toString(), inline: true },
          { name: 'Membres', value: guild.roles.member.length.toString(), inline: true }
        )
        .setTimestamp();

      if (availablePerks.length > 0) {
        const perksText = availablePerks.map(perk => 
          `**${perk.name}** (Nv.${perk.level}): ${perk.description}\nCoût: ${perk.cost} GuildCoins`
        ).join('\n\n');
        embed.addFields({ name: '🎁 Perks Disponibles', value: perksText, inline: false });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la récupération des infos guilde:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la récupération des infos guilde.'
      });
    }
  }
};
