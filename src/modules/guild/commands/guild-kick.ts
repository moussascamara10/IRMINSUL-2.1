import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User, Guild } from '../../../database/models/index.js';
import { guildService } from '../../../services/GuildService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('guild-kick')
    .setDescription('Expulser un membre de la guilde')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('L\'utilisateur à expulser')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user')!;
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

      // Vérifier que l'utilisateur est le master
      if (!guild.roles.master.includes(discordId)) {
        await interaction.editReply({
          content: 'Seul le master de la guilde peut expulser des membres.'
        });
        return;
      }

      const result = await guildService.kickMember(guild._id.toString(), targetUser.id);

      if (!result.success) {
        await interaction.editReply({
          content: result.error || 'Erreur lors de l\'expulsion.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('👢 Membre Expulsé')
        .setDescription(`<@${targetUser.id}> a été expulsé de la guilde`)
        .setColor(0xFF0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de l\'expulsion:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de l\'expulsion.'
      });
    }
  }
};
