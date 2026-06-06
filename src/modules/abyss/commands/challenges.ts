import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { endgameService } from '../../../services/EndgameService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('challenges')
    .setDescription('Voir les défis disponibles'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: '❌ Vous devez d\'abord commencer votre aventure avec `/commencer`!\n\n💡 Utilisez `/commencer` pour créer votre profil et recevoir vos ressources de départ.'
        });
        return;
      }

      // Vérifier si l'utilisateur a atteint AR 25 pour accéder aux challenges
      if (user.adventureRank < 25) {
        await interaction.editReply({
          content: `❌ Vous devez atteindre le Rang Aventurier 25 pour accéder aux défis!\n\n💡 Votre AR actuel : ${user.adventureRank}\n💡 AR requis : 25\n\n💡 Utilisez \`/guide\` pour des conseils sur comment progresser.`
        });
        return;
      }

      const availableChallenges = endgameService.getAvailableChallenges(user);

      if (availableChallenges.length === 0) {
        await interaction.editReply({
          content: 'Aucun défi disponible pour votre niveau actuel.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Défis Disponibles')
        .setDescription(`${availableChallenges.length} défi(s) disponible(s)`)
        .setColor(0xFFD700)
        .setTimestamp();

      for (const challenge of availableChallenges) {
        const canAccess = endgameService.canAccessChallenge(user, challenge.id);
        embed.addFields({
          name: `${canAccess ? '✅' : '🔒'} ${challenge.name}`,
          value: `${challenge.description}\n` +
                 `Type: ${challenge.type}\n` +
                 `AR requis: ${challenge.requirements.minAR} | WL requis: ${challenge.requirements.minWorldLevel}\n` +
                 `Limite hebdo: ${challenge.weeklyLimit}\n` +
                 `Récompenses: ${challenge.rewards.mora} Mora, ${challenge.rewards.primogens} Primogens, ${challenge.rewards.starglitter} Starglitter`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la récupération des défis:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la récupération des défis.'
      });
    }
  }
};
