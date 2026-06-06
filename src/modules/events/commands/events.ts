import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { eventService } from '../../../services/EventService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('events')
    .setDescription('Voir les événements actifs'),

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

      const activeEvents = eventService.getActiveEvents();

      if (activeEvents.length === 0) {
        await interaction.editReply({
          content: 'Aucun événement actif pour le moment.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🎉 Événements Actifs')
        .setColor(0x00FF00)
        .setDescription(`${activeEvents.length} événement(s) en cours`)
        .setTimestamp();

      for (const event of activeEvents) {
        const canAccess = eventService.canAccessEvent(user, event.id);
        const timeRemaining = eventService.getEventTimeRemaining(event.id);
        const timeText = timeRemaining 
          ? `${timeRemaining.days}j ${timeRemaining.hours}h ${timeRemaining.minutes}m`
          : 'Terminé';

        const progress = eventService.getUserProgress(discordId, event.id);
        const nextMilestone = await eventService.getNextMilestone(discordId, event.id);
        const milestoneProgress = await eventService.getMilestoneProgress(discordId, event.id);

        embed.addFields({
          name: `${canAccess ? '✅' : '🔒'} ${event.name}`,
          value: `${event.description}\n` +
                 `Type: ${event.type}\n` +
                 `AR requis: ${event.requirements.minAR} | WL requis: ${event.requirements.minWorldLevel}\n` +
                 `Temps restant: ${timeText}\n` +
                 `Progression: ${milestoneProgress.current}/${milestoneProgress.target} (${milestoneProgress.percentage}%)\n` +
                 `Prochain milestone: ${nextMilestone ? nextMilestone.points : 'Tous réclamés'} points`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la récupération des événements.'
      });
    }
  }
};
