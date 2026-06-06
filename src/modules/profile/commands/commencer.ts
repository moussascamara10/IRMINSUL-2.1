import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { progressionService } from '../../../services/ProgressionService.js';
import { economyService } from '../../../services/EconomyService.js';
import { genshinDataService } from '../../../services/GenshinDataService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('commencer')
    .setDescription('Commence votre aventure dans IRMINSUL V2'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const discordId = interaction.user.id;
    const username = interaction.user.username;
    const displayName = interaction.user.globalName || username;
    const avatar = interaction.user.displayAvatarURL();

    try {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findOne({ discordId });
      
      if (existingUser) {
        await interaction.editReply({
          content: 'Vous avez déjà commencé votre aventure! Utilisez `/profil` pour voir votre profil.'
        });
        return;
      }

      // Créer le nouvel utilisateur
      const newUser = await User.create({
        discordId,
        username,
        displayName,
        avatar,
        adventureRank: 1,
        adventureRankXP: 0,
        worldLevel: 0,
        reputation: {
          mondstadt: 0,
          liyue: 0,
          inazuma: 0,
          sumeru: 0,
          fontaine: 0,
          natlan: 0
        },
        mora: 50000, // Mora de départ
        primogens: 160, // 1 Destin de départ
        fatesIntertwined: 1,
        fatesAcquaint: 0,
        stardust: 0,
        starglitter: 0,
        resin: 160,
        lastResinUpdate: new Date(),
        condensedResin: 0,
        activeTeam: [],
        totalPulls: 0,
        totalCharacters: 0,
        totalWeapons: 0,
        totalArtifacts: 0,
        tutorialCompleted: false,
        isBanned: false
      });

      // Donner les personnages de départ (Jean, Amber, Kaeya, Lisa)
      const starterCharacters = genshinDataService.searchCharacter('jean');
      const amber = genshinDataService.searchCharacter('amber');
      const kaeya = genshinDataService.searchCharacter('kaeya');
      const lisa = genshinDataService.searchCharacter('lisa');

      // TODO: Ajouter les personnages de départ à la base de données

      const embed = new EmbedBuilder()
        .setTitle('🌟 Bienvenue dans IRMINSUL V2!')
        .setDescription(`Bonjour ${displayName}! Votre aventure à Teyvat commence maintenant.`)
        .setColor(0x0099FF)
        .addFields(
          { name: '💰 Mora de départ', value: '50,000', inline: true },
          { name: '💎 Primogems', value: '160', inline: true },
          { name: '🔮 Destins Enchevêtrés', value: '1', inline: true },
          { name: '🔷 Résine', value: '160/200', inline: true },
          { name: '📊 Rang Aventurier', value: 'AR 1', inline: true },
          { name: '🌍 Niveau Monde', value: 'WL 0', inline: true }
        )
        .addFields(
          { name: '🎁 Personnages de départ', value: 'Jean, Amber, Kaeya, Lisa', inline: false }
        )
        .addFields(
          { name: '📋 Prochaines étapes', value: '1. `/profil` - Voir votre profil\n2. `/voeux` - Faire vos premiers vœux\n3. `/daily-tasks` - Voir vos tâches quotidiennes\n4. `/guide` - Obtenir des conseils personnalisés', inline: false }
        )
        .setThumbnail(avatar)
        .setFooter({ text: 'Utilisez /guide pour des conseils personnalisés basés sur votre progression!' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la création du profil:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la création de votre profil. Veuillez réessayer.'
      });
    }
  }
};
