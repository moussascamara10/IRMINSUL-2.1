import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { activityLoopService } from '../../../services/ActivityLoopService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily-rewards')
    .setDescription('Réclamer vos récompenses quotidiennes'),

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

      const rewards = await activityLoopService.grantDailyRewards(user);

      await user.save();

      const embed = new EmbedBuilder()
        .setTitle('🎁 Récompenses Quotidiennes Réclamées!')
        .setDescription(`Vous avez réclamé vos récompenses pour ${rewards.tasksCompleted} tâche(s) complétée(s)`)
        .setColor(0xFFD700)
        .addFields(
          { name: '💰 Mora', value: rewards.mora.toLocaleString(), inline: true },
          { name: '⭐ Primogens', value: rewards.primogens.toString(), inline: true },
          { name: '📊 XP', value: rewards.xp.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la réclamation des récompenses:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la réclamation des récompenses.'
      });
    }
  }
};
