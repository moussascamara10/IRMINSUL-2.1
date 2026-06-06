import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('guide')
    .setDescription('Obtenez des conseils personnalisés basés sur votre progression'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: 'Vous devez d\'abord commencer votre aventure avec `/commencer`!'
        });
        return;
      }

      const ar = user.adventureRank;
      const guide = getGuideForAR(ar);

      const embed = new EmbedBuilder()
        .setTitle(`📚 Guide de Progression - AR ${ar}`)
        .setDescription(guide.description)
        .setColor(0x0099FF)
        .addFields(
          { name: '🎯 Objectifs Actuels', value: guide.objectives.join('\n'), inline: false }
        );

      if (guide.commands.length > 0) {
        embed.addFields({ name: '🔧 Commandes Recommandées', value: guide.commands.join('\n'), inline: false });
      }

      if (guide.tips.length > 0) {
        embed.addFields({ name: '💡 Conseils', value: guide.tips.join('\n'), inline: false });
      }

      if (guide.nextPhase) {
        embed.addFields({ name: '📈 Prochaine Phase', value: guide.nextPhase, inline: false });
      }

      embed.setFooter({ text: 'Utilisez /menu pour voir toutes les commandes disponibles' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de l\'affichage du guide:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de l\'affichage du guide.'
      });
    }
  }
};

function getGuideForAR(ar: number) {
  if (ar <= 10) {
    return {
      description: '🌟 **Phase de Découverte**\nBienvenue dans IRMINSUL V2! Vous êtes au début de votre aventure.',
      objectives: [
        '✅ Compléter vos tâches quotidiennes',
        '✅ Faire vos premiers vœux avec votre Destin',
        '✅ Atteindre AR 5 pour débloquer les domaines',
        '✅ Atteindre AR 8 pour débloquer les boss',
        '✅ Atteindre AR 10 pour débloquer les guildes'
      ],
      commands: [
        '`/daily-tasks` - Voir vos tâches quotidiennes',
        '`/daily-complete` - Compléter une tâche',
        '`/daily-rewards` - Réclamer vos récompenses',
        '`/voeux` - Faire des vœux',
        '`/profil` - Voir votre progression'
      ],
      tips: [
        '💰 Utilisez vos 50,000 Mora de départ avec sagesse',
        '💎 Gardez vos Primogens pour les bannières que vous voulez vraiment',
        '🔷 Gérez votre résine : elle se régénère avec le temps',
        '🎭 Vos personnages de départ (Jean, Amber, Kaeya, Lisa) sont solides pour débuter'
      ],
      nextPhase: 'À AR 10, vous pourrez rejoindre une guilde et accéder au contenu intermédiaire.'
    };
  }

  if (ar <= 25) {
    return {
      description: '🏗️ **Phase de Construction**\nVous construisez votre équipe et progressez dans le contenu.',
      objectives: [
        '✅ Rejoindre ou créer une guilde',
        '✅ Explorer les domaines pour des artefacts',
        '✅ Combattre des boss pour des matériaux',
        '✅ Compléter vos tâches hebdomadaires',
        '✅ Atteindre AR 15 pour débloquer les expéditions',
        '✅ Atteindre AR 20 pour débloquer les raids',
        '✅ Atteindre AR 25 pour débloquer les défis'
      ],
      commands: [
        '`/guild-create` ou `/guild-join` - Rejoindre une guilde',
        '`/domain` - Explorer les domaines',
        '`/boss` - Combattre des boss',
        '`/weekly-tasks` - Voir vos tâches hebdomadaires',
        '`/guild-donate` - Contribuer à votre guilde'
      ],
      tips: [
        '🏰 Les guildes offrent des perks et des activités sociales',
        '⚔️ Les domaines sont essentiels pour améliorer vos artefacts',
        '👥 Les boss donnent des matériaux rares pour l\'amélioration',
        '📅 Les tâches hebdomadaires offrent des récompenses importantes'
      ],
      nextPhase: 'À AR 25, vous pourrez accéder aux expéditions et au contenu avancé.'
    };
  }

  if (ar <= 45) {
    return {
      description: '⚡ **Phase d\'Optimisation**\nVous optimisez votre équipe et participez au contenu avancé.',
      objectives: [
        '✅ Envoyer des expéditions régulièrement',
        '✅ Participer aux raids de guilde',
        '✅ Relever des défis pour des récompenses',
        '✅ Participer aux événements limités',
        '✅ Débloquer des perks de guilde',
        '✅ Atteindre AR 35 pour les événements spéciaux',
        '✅ Atteindre AR 45 pour l\'endgame complet'
      ],
      commands: [
        '`/expedition` - Envoyer des expéditions',
        '`/raids` - Voir les raids disponibles',
        '`/challenges` - Voir les défis disponibles',
        '`/events` - Voir les événements actifs',
        '`/guild-perk` - Débloquer des perks'
      ],
      tips: [
        '🚀 Les expéditions rapportent des ressources passivement',
        '⚔️ Les raids nécessitent une coordination de guilde',
        '🎯 Les défis testent vos compétences et récompensent généreusement',
        '🎪 Les événements limités offrent des récompenses exclusives'
      ],
      nextPhase: 'À AR 45, vous accéderez à l\'endgame complet avec le contenu le plus difficile.'
    };
  }

  return {
    description: '🏆 **Phase Endgame**\nVous êtes au sommet de la progression. Maximisez votre potentiel!',
    objectives: [
      '✅ Participer aux raids de difficulté maximale',
      '✅ Relever tous les défis extrêmes',
      '✅ Participer activement aux événements spéciaux',
      '✅ Optimiser votre équipe avec les meilleurs artefacts',
      '✅ Atteindre AR 60 - le niveau maximum'
    ],
    commands: [
      '`/raids` - Raids de difficulté maximale',
      '`/challenges` - Défis extrêmes',
      '`/events` - Événements spéciaux',
      '`/pity` - Gérer votre pity pour les vœux',
      '`/statistiques` - Voir vos statistiques détaillées'
    ],
    tips: [
      '🎯 L\'endgame demande une optimisation minutieuse de votre équipe',
      '💎 Gérez votre pity stratégiquement pour les personnages 5★',
      '🏆 Les défis extrêmes offrent les meilleures récompenses',
      '🎪 Les événements spéciaux sont rares - ne les manquez pas!'
    ],
    nextPhase: 'Vous avez atteint le sommet! Continuez à optimiser et à participer au contenu.'
  };
}
