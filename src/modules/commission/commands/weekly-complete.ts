import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { activityLoopService } from '../../../services/ActivityLoopService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('weekly-complete')
    .setDescription('Compléter une tâche hebdomadaire')
    .addStringOption(option =>
      option
        .setName('task')
        .setDescription('L\'ID de la tâche à compléter')
        .setRequired(true)
        .addChoices(
          { name: 'Raids de guilde', value: 'weekly_raid_3' },
          { name: 'Boss hebdomadaires', value: 'weekly_boss_5' },
          { name: 'Domains', value: 'weekly_domain_10' },
          { name: 'Événements', value: 'weekly_event_3' },
          { name: 'Contribution guilde', value: 'weekly_guild_contribution' },
          { name: 'Raids intensifs', value: 'weekly_raid_10' },
          { name: 'Chasse aux bosses', value: 'weekly_boss_15' },
          { name: 'Spiral Abyss complet', value: 'weekly_spiral_abyss_36' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const taskId = interaction.options.getString('task')!;
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: 'Vous devez d\'abord commencer votre aventure avec `/commencer`!'
        });
        return;
      }

      const result = await activityLoopService.completeWeeklyTask(discordId, taskId);

      if (!result.success) {
        await interaction.editReply({
          content: result.error || 'Erreur lors de la complétion de la tâche.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('✅ Tâche Hebdomadaire Complétée!')
        .setDescription('Vous avez complété une tâche hebdomadaire')
        .setColor(0x9900FF)
        .addFields(
          { name: '💰 Mora', value: result.rewards?.mora.toString() || '0', inline: true },
          { name: '⭐ Primogens', value: result.rewards?.primogens.toString() || '0', inline: true },
          { name: '🔮 Fates', value: result.rewards?.fates.toString() || '0', inline: true },
          { name: '💎 Starglitter', value: result.rewards?.starglitter.toString() || '0', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la complétion de la tâche:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la complétion de la tâche.'
      });
    }
  }
};
