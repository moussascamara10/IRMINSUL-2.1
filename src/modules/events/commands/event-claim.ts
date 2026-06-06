import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { eventService } from '../../../services/EventService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('event-claim')
    .setDescription('Réclamer un milestone d\'événement')
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
    .addIntegerOption(option =>
      option
        .setName('points')
        .setDescription('Le nombre de points du milestone à réclamer')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const eventId = interaction.options.getString('event')!;
    const milestonePoints = interaction.options.getInteger('points')!;
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

      const result = await eventService.claimMilestone(discordId, eventId, milestonePoints);

      if (!result.success) {
        await interaction.editReply({
          content: result.rewards.mora === 0 && result.rewards.primogens === 0 && result.rewards.fates === 0
            ? 'Milestone déjà réclamé ou points insuffisants.'
            : 'Erreur lors de la réclamation du milestone.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🎁 Milestone Réclamé!')
        .setDescription(`Vous avez réclamé le milestone à ${milestonePoints} points pour ${event.name}`)
        .setColor(0xFFD700)
        .addFields(
          { name: '💰 Mora', value: result.rewards.mora.toString(), inline: true },
          { name: '💎 Primogens', value: result.rewards.primogens.toString(), inline: true },
          { name: '🔮 Fates', value: result.rewards.fates.toString(), inline: true }
        )
        .setTimestamp();

      if (result.rewards.exclusiveItems.length > 0) {
        embed.addFields({
          name: '🎁 Items Exclusifs',
          value: result.rewards.exclusiveItems.join(', '),
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la réclamation du milestone:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la réclamation du milestone.'
      });
    }
  }
};
