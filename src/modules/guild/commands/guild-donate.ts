import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User, Guild } from '../../../database/models/index.js';
import { guildService } from '../../../services/GuildService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('guild-donate')
    .setDescription('Faire un don à votre guilde')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Le montant de Mora à donner')
        .setRequired(true)
        .setMinValue(100)
        .setMaxValue(1000000)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount')!;
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

      const result = await guildService.donateToGuild(user, amount);

      if (!result.success) {
        await interaction.editReply({
          content: result.error || 'Erreur lors du don.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('💰 Don Effectué!')
        .setDescription(`Vous avez donné ${amount.toLocaleString()} Mora à la guilde **${guild.name}**`)
        .setColor(0x00FF00)
        .addFields(
          { name: 'Montant', value: amount.toLocaleString(), inline: true },
          { name: 'Votre contribution totale', value: user.guildContribution.toLocaleString(), inline: true },
          { name: 'GuildCoins de la guilde', value: guild.guildCoins.toLocaleString(), inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors du don:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors du don.'
      });
    }
  }
};
