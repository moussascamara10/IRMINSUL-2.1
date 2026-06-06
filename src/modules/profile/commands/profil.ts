import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User, CharacterOwned } from '../../../database/models/index.js';
import { genshinDataService } from '../../../services/GenshinDataService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Affiche votre profil de joueur')
    .addUserOption(option =>
      option
        .setName('utilisateur')
        .setDescription('Voir le profil d\'un autre utilisateur')
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

      // Calculer la résine actuelle
      const currentResin = Math.min(
        user.resin + Math.floor((Date.now() - user.lastResinUpdate.getTime()) / (8 * 60 * 1000)),
        200
      );

      // Récupérer les personnages de l'utilisateur
      const characters = await CharacterOwned.find({ userId: discordId }).sort({ rarity: -1, level: -1 });

      // Calculer le pourcentage d'AR
      const arXPTable: { [key: number]: number } = {
        1: 0, 2: 275, 3: 600, 4: 975, 5: 1400, 6: 1875, 7: 2400, 8: 2975, 9: 3600, 10: 4275,
        11: 5000, 12: 5775, 13: 6600, 14: 7475, 15: 8400, 16: 9375, 17: 10400, 18: 11475, 19: 12600, 20: 13775,
        21: 15000, 22: 16275, 23: 17600, 24: 18975, 25: 20400, 26: 21875, 27: 23400, 28: 24975, 29: 26600, 30: 28275,
        31: 30000, 32: 31775, 33: 33600, 34: 35475, 35: 37400, 36: 39375, 37: 41400, 38: 43475, 39: 45600, 40: 47775,
        41: 50000, 42: 52275, 43: 54600, 44: 56975, 45: 59400, 46: 61875, 47: 64400, 48: 66975, 49: 69600, 50: 72275,
        51: 75000, 52: 77775, 53: 80600, 54: 83475, 55: 86400, 56: 89375, 57: 92400, 58: 95475, 59: 98600, 60: 101775
      };

      const currentARXP = arXPTable[user.adventureRank] || 0;
      const nextARXP = arXPTable[user.adventureRank + 1] || currentARXP;
      const arProgress = user.adventureRank >= 60 ? 100 : ((user.adventureRankXP - currentARXP) / (nextARXP - currentARXP)) * 100;

      // Créer l'embed
      const embed = new EmbedBuilder()
        .setTitle(`👤 Profil de ${user.displayName}`)
        .setColor(0x0099FF)
        .setThumbnail(user.avatar || targetUser.displayAvatarURL())
        .addFields(
          { name: '📊 Rang Aventurier', value: `AR ${user.adventureRank}`, inline: true },
          { name: '🌍 Niveau Monde', value: `WL ${user.worldLevel}`, inline: true },
          { name: '⏱️ XP AR', value: `${Math.floor(arProgress)}%`, inline: true },
          { name: '💰 Mora', value: user.mora.toLocaleString(), inline: true },
          { name: '💎 Primogems', value: user.primogens.toLocaleString(), inline: true },
          { name: '🔷 Résine', value: `${currentResin}/200`, inline: true }
        )
        .addFields(
          { name: '🔮 Destins', value: `Enchevêtrés: ${user.fatesIntertwined}\nEntrelacés: ${user.fatesAcquaint}`, inline: true },
          { name: '✨ Starglitter', value: user.starglitter.toLocaleString(), inline: true },
          { name: '🌟 Stardust', value: user.stardust.toLocaleString(), inline: true }
        )
        .addFields(
          { name: '👥 Personnages', value: `${characters.length} (${characters.filter(c => c.rarity === 5).length} 5★)`, inline: true },
          { name: '⚔️ Armes', value: user.totalWeapons.toString(), inline: true },
          { name: '🛡️ Artefacts', value: user.totalArtifacts.toString(), inline: true }
        );

      // Afficher l'équipe active
      if (user.activeTeam.length > 0) {
        const teamNames = user.activeTeam.map(charId => {
          const char = characters.find(c => c.characterId === charId);
          return char ? char.characterName : 'Inconnu';
        }).join(', ');
        
        embed.addFields({ name: '⚔️ Équipe Active', value: teamNames || 'Aucune', inline: false });
      }

      // Afficher les 5 personnages les plus puissants
      if (characters.length > 0) {
        const topCharacters = characters.slice(0, 5);
        const charList = topCharacters.map(c => {
          const emoji = getRarityEmoji(c.rarity);
          return `${emoji} ${c.characterName} (Nv.${c.level} C${c.constellation})`;
        }).join('\n');
        
        embed.addFields({ name: '🎭 Top Personnages', value: charList, inline: false });
      }

      embed.setFooter({ text: `ID: ${discordId} • Créé le: ${user.createdAt.toLocaleDateString('fr-FR')}` })
        .setTimestamp();

      // Ajouter des suggestions contextuelles basées sur l'AR
      let suggestion = '';
      if (user.adventureRank <= 10) {
        suggestion = '\n\n💡 **Conseil:** Utilisez `/guide` pour des conseils personnalisés basés sur votre progression!';
      } else if (user.adventureRank <= 25) {
        suggestion = '\n\n💡 **Conseil:** Pensez à rejoindre une guilde avec `/guild-join` pour débloquer des perks!';
      } else if (user.adventureRank <= 45) {
        suggestion = '\n\n💡 **Conseil:** Participez aux raids et défis avec `/raids` et `/challenges`!';
      } else {
        suggestion = '\n\n💡 **Conseil:** Vous êtes en endgame! Optimisez votre équipe avec les meilleurs artefacts.';
      }

      await interaction.editReply({ embeds: [embed], content: suggestion });

    } catch (error) {
      console.error('Erreur lors de l\'affichage du profil:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de l\'affichage du profil.'
      });
    }
  }
};

function getRarityEmoji(rarity: number): string {
  switch (rarity) {
    case 5: return '⭐⭐⭐⭐⭐';
    case 4: return '⭐⭐⭐⭐';
    default: return '⭐⭐⭐';
  }
}
