import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { eventService } from '../../../services/EventService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('event-info')
    .setDescription('Voir les détails d\'un événement')
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

      const canAccess = eventService.canAccessEvent(user, eventId);
      const isActive = eventService.isEventActive(eventId);
      const timeRemaining = eventService.getEventTimeRemaining(eventId);

      const embed = new EmbedBuilder()
        .setTitle(`${canAccess ? '✅' : '🔒'} ${event.name}`)
        .setDescription(event.description)
        .setColor(isActive ? 0x00FF00 : 0xFF0000)
        .addFields(
          { name: 'Type', value: event.type, inline: true },
          { name: 'AR requis', value: event.requirements.minAR.toString(), inline: true },
          { name: 'WL requis', value: event.requirements.minWorldLevel.toString(), inline: true },
          { name: 'Statut', value: isActive ? 'Actif' : 'Inactif', inline: true },
          { name: 'Temps restant', value: timeRemaining ? `${timeRemaining.days}j ${timeRemaining.hours}h ${timeRemaining.minutes}m` : 'Terminé', inline: true }
        )
        .setTimestamp();

      // Afficher les activités
      if (event.activities.length > 0) {
        const activitiesText = event.activities.map((activity, index) => {
          return `${index + 1}. **${activity.name}** (${activity.type})\n` +
                 `   ${activity.description}\n` +
                 `   Récompense: ${activity.rewards.eventCurrency} devise, ${activity.rewards.mora} mora, ${activity.rewards.primogens} primogens`;
        }).join('\n\n');

        embed.addFields({ name: '📋 Activités', value: activitiesText, inline: false });
      }

      // Afficher les milestones
      if (event.milestones.length > 0) {
        const milestonesText = event.milestones.map((milestone, index) => {
          return `${index + 1}. **${milestone.points} points**\n` +
                 `   ${milestone.rewards.mora} mora, ${milestone.rewards.primogens} primogens, ${milestone.rewards.fates} fates`;
        }).join('\n\n');

        embed.addFields({ name: '🏆 Milestones', value: milestonesText, inline: false });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la récupération des infos événement:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la récupération des infos événement.'
      });
    }
  }
};
