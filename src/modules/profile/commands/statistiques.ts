import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User, GachaHistory } from '../../../database/models/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('statistiques')
    .setDescription('Affiche vos statistiques de jeu')
    .addUserOption(option =>
      option
        .setName('utilisateur')
        .setDescription('Voir les statistiques d\'un autre utilisateur')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
    const discordId = targetUser.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: 'Cet utilisateur n\'a pas encore commencé son aventure!'
        });
        return;
      }

      // Récupérer l'historique des gacha
      const gachaHistory = await GachaHistory.find({ userId: discordId }).sort({ pulledAt: -1 });

      // Calculer les statistiques
      const totalPulls = user.totalPulls;
      const fiveStarCount = gachaHistory.filter(h => h.rarity === 5).length;
      const fourStarCount = gachaHistory.filter(h => h.rarity === 4).length;
      const threeStarCount = gachaHistory.filter(h => h.rarity === 3).length;

      const fiveStarRate = totalPulls > 0 ? ((fiveStarCount / totalPulls) * 100).toFixed(2) : '0.00';
      const fourStarRate = totalPulls > 0 ? ((fourStarCount / totalPulls) * 100).toFixed(2) : '0.00';

      // Statistiques par bannière
      const standardPulls = gachaHistory.filter(h => h.bannerType === 'standard').length;
      const characterPulls = gachaHistory.filter(h => h.bannerType === 'character').length;
      const weaponPulls = gachaHistory.filter(h => h.bannerType === 'weapon').length;

      // Derniers pulls
      const recentPulls = gachaHistory.slice(0, 10);
      const recentPullsText = recentPulls.length > 0 
        ? recentPulls.map(p => {
          const emoji = p.rarity === 5 ? '⭐⭐⭐⭐⭐' : p.rarity === 4 ? '⭐⭐⭐⭐' : '⭐⭐⭐';
          return `${emoji} ${p.itemName}`;
        }).join('\n')
        : 'Aucun pull récent';

      const embed = new EmbedBuilder()
        .setTitle(`📊 Statistiques de ${user.displayName}`)
        .setColor(0xFFD700)
        .setThumbnail(user.avatar || targetUser.displayAvatarURL())
        .addFields(
          { name: '🎲 Total Pulls', value: totalPulls.toString(), inline: true },
          { name: '⭐⭐⭐⭐⭐ 5★', value: `${fiveStarCount} (${fiveStarRate}%)`, inline: true },
          { name: '⭐⭐⭐⭐ 4★', value: `${fourStarCount} (${fourStarRate}%)`, inline: true },
          { name: '⭐⭐⭐ 3★', value: threeStarCount.toString(), inline: true }
        )
        .addFields(
          { name: '🎨 Bannière Standard', value: standardPulls.toString(), inline: true },
          { name: '👤 Bannière Personnages', value: characterPulls.toString(), inline: true },
          { name: '⚔️ Bannière Armes', value: weaponPulls.toString(), inline: true }
        )
        .addFields(
          { name: '👥 Personnages', value: user.totalCharacters.toString(), inline: true },
          { name: '⚔️ Armes', value: user.totalWeapons.toString(), inline: true },
          { name: '🛡️ Artefacts', value: user.totalArtifacts.toString(), inline: true }
        );

      if (recentPulls.length > 0) {
        embed.addFields({ name: '📜 Derniers Pulls', value: recentPullsText, inline: false });
      }

      embed.setFooter({ text: `ID: ${discordId}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de l\'affichage des statistiques:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de l\'affichage des statistiques.'
      });
    }
  }
};
