import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { activityLoopService } from '../../../services/ActivityLoopService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily-tasks')
    .setDescription('Voir vos tâches quotidiennes'),

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

      const availableTasks = await activityLoopService.getAvailableDailyTasks(discordId);
      const progress = await activityLoopService.getDailyProgress(discordId);
      const completionPercentage = await activityLoopService.getDailyCompletionPercentage(discordId);
      const timeUntilReset = activityLoopService.getTimeUntilDailyReset();

      const embed = new EmbedBuilder()
        .setTitle('📋 Tâches Quotidiennes')
        .setDescription(`Progression: ${completionPercentage}% (${progress.completedTasks.length}/${activityLoopService.getDailyTasks().length})`)
        .setColor(0x0099FF)
        .addFields(
          { name: '⏰ Réinitialisation dans', value: `${timeUntilReset.hours}h ${timeUntilReset.minutes}m`, inline: true },
          { name: '🎁 Récompenses totales', value: `${activityLoopService.getTotalDailyRewards().mora} Mora, ${activityLoopService.getTotalDailyRewards().primogens} Primogens`, inline: true }
        )
        .setTimestamp();

      if (availableTasks.length > 0) {
        const tasksText = availableTasks.map((task, index) => {
          return `${index + 1}. **${task.name}** (${task.category})\n` +
                 `   ${task.description}\n` +
                 `   Récompense: ${task.rewards.mora} Mora, ${task.rewards.primogens} Primogens`;
        }).join('\n\n');

        embed.addFields({ name: '📝 Tâches Disponibles', value: tasksText, inline: false });
      } else {
        embed.addFields({ name: '✅ Toutes les tâches complétées!', value: 'Utilisez `/daily-rewards` pour réclamer vos récompenses.', inline: false });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la récupération des tâches quotidiennes:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la récupération des tâches quotidiennes.'
      });
    }
  }
};
