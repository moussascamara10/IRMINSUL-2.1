import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { eventService } from '../../../services/EventService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('event-progress')
    .setDescription('Voir votre progression dans un événement')
    .addStringOption(option =>
      option
        .setName('event')
        .setDescription('L\'ID de l\'événement')
        .setRequired(true)
        .addChoices(
          { name: 'Fête des Lanternes', value: 'lantern_rite' },
          { name: 'Fête des Fleurs', value: 'windblume' },
          { name: 'Défi Hypostatique', value: 'hypostatic' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const eventId = interaction.options.getString('event')!;
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: 'Vous devez d\'abord commencer votre aventure avec `/commencer`!'
        });
        return;
      }

      const event = eventService.getEvent(eventId);

      if (!event) {
        await interaction.editReply({
          content: 'Événement introuvable.'
        });
        return;
      }

      const progress = await eventService.getUserProgress(discordId, eventId);
      const nextMilestone = await eventService.getNextMilestone(discordId, eventId);
      const milestoneProgress = await eventService.getMilestoneProgress(discordId, eventId);

      const embed = new EmbedBuilder()
        .setTitle(`📊 Progression: ${event.name}`)
        .setDescription(`Devise d'événement: ${progress.eventCurrency}`)
        .setColor(0x0099FF)
        .addFields(
          { name: 'Progression Milestone', value: `${milestoneProgress.current}/${milestoneProgress.target} (${milestoneProgress.percentage}%)`, inline: true },
          { name: 'Activités complétées', value: progress.completedActivities.length.toString(), inline: true },
          { name: 'Milestones réclamés', value: progress.claimedMilestones.length.toString(), inline: true }
        )
        .setTimestamp();

      if (nextMilestone) {
        embed.addFields({
          name: '🎯 Prochain Milestone',
          value: `${nextMilestone.points} points\n` +
                 `Récompenses: ${nextMilestone.rewards.mora} mora, ${nextMilestone.rewards.primogens} primogens, ${nextMilestone.rewards.fates} fates`,
          inline: false
        });
      } else {
        embed.addFields({
          name: '🎯 Prochain Milestone',
          value: 'Tous les milestones ont été réclamés!',
          inline: false
        });
      }

      // Afficher les activités complétées
      if (progress.completedActivities.length > 0) {
        const completedActivitiesText = progress.completedActivities.map((activityId: string) => {
          const activity = event.activities.find(a => a.id === activityId);
          return activity ? `✅ ${activity.name}` : activityId;
        }).join('\n');

        embed.addFields({ name: '✅ Activités Complétées', value: completedActivitiesText, inline: false });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la récupération de la progression:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la récupération de la progression.'
      });
    }
  }
};
