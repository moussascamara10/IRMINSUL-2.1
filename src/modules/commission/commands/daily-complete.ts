import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { activityLoopService } from '../../../services/ActivityLoopService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily-complete')
    .setDescription('Compléter une tâche quotidienne')
    .addStringOption(option =>
      option
        .setName('task')
        .setDescription('L\'ID de la tâche à compléter')
        .setRequired(true)
        .addChoices(
          { name: 'Connexion quotidienne', value: 'daily_login' },
          { name: 'Commission 1', value: 'daily_commission_1' },
          { name: 'Commissions quotidiennes', value: 'daily_commission_3' },
          { name: 'Boss quotidien', value: 'daily_boss_1' },
          { name: 'Domaine quotidien', value: 'daily_domain_1' },
          { name: 'Vœu quotidien', value: 'daily_gacha_1' },
          { name: 'Vœux multiples', value: 'daily_gacha_10' },
          { name: 'Expédition', value: 'daily_expedition_1' },
          { name: 'Artisanat', value: 'daily_craft_5' },
          { name: 'Social', value: 'daily_social_chat' },
          { name: 'Boss Elite', value: 'daily_elite_boss' },
          { name: 'Spiral Abyss', value: 'daily_spiral_abyss' }
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
          content: '❌ Vous devez d\'abord commencer votre aventure avec `/commencer`!\n\n💡 Utilisez `/commencer` pour créer votre profil et recevoir vos ressources de départ.'
        });
        return;
      }

      const result = await activityLoopService.completeDailyTask(discordId, taskId);

      if (!result.success) {
        await interaction.editReply({
          content: result.error || 'Erreur lors de la complétion de la tâche.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('✅ Tâche Quotidienne Complétée!')
        .setDescription('Vous avez complété une tâche quotidienne')
        .setColor(0x00FF00)
        .addFields(
          { name: '💰 Mora', value: result.rewards?.mora.toString() || '0', inline: true },
          { name: '⭐ Primogens', value: result.rewards?.primogens.toString() || '0', inline: true },
          { name: '📊 XP', value: result.rewards?.xp.toString() || '0', inline: true }
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
