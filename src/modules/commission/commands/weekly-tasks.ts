import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { activityLoopService } from '../../../services/ActivityLoopService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('weekly-tasks')
    .setDescription('Voir vos tâches hebdomadaires'),

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

      const availableTasks = await activityLoopService.getAvailableWeeklyTasks(discordId);
      const progress = await activityLoopService.getWeeklyProgress(discordId);
      const completionPercentage = await activityLoopService.getWeeklyCompletionPercentage(discordId);
      const timeUntilReset = activityLoopService.getTimeUntilWeeklyReset();

      const embed = new EmbedBuilder()
        .setTitle('📋 Tâches Hebdomadaires')
        .setDescription(`Progression: ${completionPercentage}% (${progress.completedTasks.length}/${activityLoopService.getWeeklyTasks().length})`)
        .setColor(0x9900FF)
        .addFields(
          { name: '⏰ Réinitialisation dans', value: `${timeUntilReset.days}j ${timeUntilReset.hours}h`, inline: true },
          { name: '🎁 Récompenses totales', value: `${activityLoopService.getTotalWeeklyRewards().mora} Mora, ${activityLoopService.getTotalWeeklyRewards().primogens} Primogens, ${activityLoopService.getTotalWeeklyRewards().fates} Fates`, inline: true }
        )
        .setTimestamp();

      if (availableTasks.length > 0) {
        const tasksText = availableTasks.map((task, index) => {
          return `${index + 1}. **${task.name}** (${task.category})\n` +
                 `   ${task.description}\n` +
                 `   Récompense: ${task.rewards.mora} Mora, ${task.rewards.primogens} Primogens, ${task.rewards.fates} Fates`;
        }).join('\n\n');

        embed.addFields({ name: '📝 Tâches Disponibles', value: tasksText, inline: false });
      } else {
        embed.addFields({ name: '✅ Toutes les tâches complétées!', value: 'Utilisez `/weekly-rewards` pour réclamer vos récompenses.', inline: false });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la récupération des tâches hebdomadaires:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la récupération des tâches hebdomadaires.'
      });
    }
  }
};
