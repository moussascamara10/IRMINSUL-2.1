import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { endgameService } from '../../../services/EndgameService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('raids')
    .setDescription('Voir les raids disponibles'),

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

      // Vérifier si l'utilisateur a atteint AR 20 pour accéder aux raids
      if (user.adventureRank < 20) {
        await interaction.editReply({
          content: `❌ Vous devez atteindre le Rang Aventurier 20 pour accéder aux raids!\n\n💡 Votre AR actuel : ${user.adventureRank}\n💡 AR requis : 20\n\n💡 Utilisez \`/guide\` pour des conseils sur comment progresser.`
        });
        return;
      }

      const availableRaids = endgameService.getAvailableRaids(user);

      if (availableRaids.length === 0) {
        await interaction.editReply({
          content: 'Aucun raid disponible pour votre niveau actuel.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('⚔️ Raids Disponibles')
        .setDescription(`${availableRaids.length} raid(s) disponible(s)`)
        .setColor(0xFF0000)
        .setTimestamp();

      for (const raid of availableRaids) {
        const canAccess = endgameService.canAccessRaid(user, raid.id);
        embed.addFields({
          name: `${canAccess ? '✅' : '🔒'} ${raid.name}`,
          value: `${raid.description}\n` +
                 `Difficulté: ${raid.difficulty}\n` +
                 `AR requis: ${raid.minAR} | WL requis: ${raid.minWorldLevel}\n` +
                 `Participants max: ${raid.maxParticipants}\n` +
                 `Coût en résine: ${raid.entryCost}\n` +
                 `Récompenses: ${raid.rewards.mora} Mora, ${raid.rewards.primogens} Primogens`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la récupération des raids:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la récupération des raids.'
      });
    }
  }
};
