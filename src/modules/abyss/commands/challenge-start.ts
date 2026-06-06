import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { endgameService } from '../../../services/EndgameService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('challenge-start')
    .setDescription('Démarrer un défi')
    .addStringOption(option =>
      option
        .setName('challenge')
        .setDescription('Le défi à démarrer')
        .setRequired(true)
        .addChoices(
          { name: 'Spiral Abyss - Time Trial', value: 'spirits_abyss_time_trial' },
          { name: 'No Damage Challenge', value: 'no_damage_run' },
          { name: 'Elemental Mastery Challenge', value: 'elemental_mastery' },
          { name: 'Survival Mode', value: 'survival_mode' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const challengeId = interaction.options.getString('challenge')!;
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: 'Vous devez d\'abord commencer votre aventure avec `/commencer`!'
        });
        return;
      }

      const canAccess = endgameService.canAccessChallenge(user, challengeId);

      if (!canAccess) {
        await interaction.editReply({
          content: 'Vous ne pouvez pas accéder à ce défi. Vérifiez votre AR et World Level.'
        });
        return;
      }

      const challenge = endgameService.getChallenge(challengeId);

      if (!challenge) {
        await interaction.editReply({
          content: 'Défi introuvable.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Défi Démarré!')
        .setDescription(`Vous avez lancé le défi **${challenge.name}**`)
        .setColor(0xFFD700)
        .addFields(
          { name: 'Type', value: challenge.type, inline: true },
          { name: 'Objectif principal', value: challenge.objectives.primary, inline: true },
          { name: 'Objectif secondaire', value: challenge.objectives.secondary || 'Aucun', inline: true },
          { name: 'Récompenses', value: `${challenge.rewards.mora} Mora, ${challenge.rewards.primogens} Primogens, ${challenge.rewards.starglitter} Starglitter`, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors du démarrage du défi:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors du démarrage du défi.'
      });
    }
  }
};
