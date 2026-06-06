import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User, Guild } from '../../../database/models/index.js';
import { guildService } from '../../../services/GuildService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('guild-demote')
    .setDescription('Rétrograder un officier au rang de membre')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('L\'utilisateur à rétrograder')
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
          content: 'Seul le master de la guilde peut rétrograder des membres.'
        });
        return;
      }

      const result = await guildService.demoteMember(guild._id.toString(), targetUser.id);

      if (!result.success) {
        await interaction.editReply({
          content: result.error || 'Erreur lors de la rétrogradation.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📉 Membre Rétrogradé')
        .setDescription(`<@${targetUser.id}> a été rétrogradé au rang de membre`)
        .setColor(0xFF9900)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la rétrogradation:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la rétrogradation.'
      });
    }
  }
};
