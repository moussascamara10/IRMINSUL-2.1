import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { eventService } from '../../../services/EventService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('event-complete')
    .setDescription('Compléter une activité d\'événement')
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
    )
    .addStringOption(option =>
      option
        .setName('activity')
        .setDescription('L\'ID de l\'activité')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const eventId = interaction.options.getString('event')!;
    const activityId = interaction.options.getString('activity')!;
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

      if (!eventService.isEventActive(eventId)) {
        await interaction.editReply({
          content: 'Cet événement n\'est pas actif.'
        });
        return;
      }

      const result = await eventService.completeActivity(discordId, eventId, activityId);

      if (!result.success) {
        await interaction.editReply({
          content: result.currencyEarned === 0 && result.moraEarned === 0 && result.primogensEarned === 0
            ? 'Activité déjà complétée ou introuvable.'
            : 'Erreur lors de la complétion de l\'activité.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('✅ Activité Complétée!')
        .setDescription(`Vous avez complété une activité pour ${event.name}`)
        .setColor(0x00FF00)
        .addFields(
          { name: '💰 Devise gagnée', value: result.currencyEarned.toString(), inline: true },
          { name: '💎 Mora gagnée', value: result.moraEarned.toString(), inline: true },
          { name: '⭐ Primogens gagnés', value: result.primogensEarned.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la complétion de l\'activité:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la complétion de l\'activité.'
      });
    }
  }
};
