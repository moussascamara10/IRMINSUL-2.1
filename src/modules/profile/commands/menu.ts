import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Affiche le menu des commandes disponibles pour votre niveau'),

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
      const menu = getMenuForAR(ar);

      const embed = new EmbedBuilder()
        .setTitle(`📋 Menu des Commandes - AR ${ar}`)
        .setDescription(menu.description)
        .setColor(0x0099FF);

      menu.categories.forEach(category => {
        embed.addFields({
          name: category.name,
          value: category.commands.join('\n'),
          inline: false
        });
      });

      embed.setFooter({ text: 'Utilisez /guide pour des conseils personnalisés' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de l\'affichage du menu:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de l\'affichage du menu.'
      });
    }
  }
};

function getMenuForAR(ar: number) {
  const beginnerCommands = [
    '`/commencer` - Démarrer l\'aventure',
    '`/profil` - Voir votre profil',
    '`/voeux` - Faire des vœux',
    '`/banniere` - Voir les bannières',
    '`/daily-tasks` - Voir les tâches quotidiennes',
    '`/daily-complete` - Compléter une tâche',
    '`/daily-rewards` - Réclamer les récompenses'
  ];

  const intermediateCommands = [
    '`/domain` - Explorer les domaines',
    '`/boss` - Combattre des boss',
    '`/guild-create` - Créer une guilde',
    '`/guild-join` - Rejoindre une guilde',
    '`/guild-info` - Voir les infos de guilde',
    '`/guild-donate` - Faire un don',
    '`/weekly-tasks` - Voir les tâches hebdomadaires',
    '`/weekly-complete` - Compléter une tâche',
    '`/weekly-rewards` - Réclamer les récompenses'
  ];

  const advancedCommands = [
    '`/expedition` - Envoyer des expéditions',
    '`/raids` - Voir les raids',
    '`/raid-start` - Démarrer un raid',
    '`/challenges` - Voir les défis',
    '`/challenge-start` - Démarrer un défi',
    '`/events` - Voir les événements',
    '`/event-info` - Détails d\'événement',
    '`/event-progress` - Progression d\'événement',
    '`/event-complete` - Compléter une activité',
    '`/event-claim` - Réclamer un milestone',
    '`/guild-perk` - Débloquer un perk',
    '`/guild-members` - Voir les membres'
  ];

  const endgameCommands = [
    '`/pity` - Voir votre pity',
    '`/statistiques` - Voir vos statistiques',
    '`/guild-promote` - Promouvoir un membre',
    '`/guild-demote` - Rétrograder un membre',
    '`/guild-kick` - Expulser un membre',
    '`/guild-leave` - Quitter la guilde'
  ];

  const alwaysAvailable = [
    '`/guide` - Obtenir des conseils',
    '`/menu` - Voir ce menu'
  ];

  if (ar <= 10) {
    return {
      description: '🌟 **Commandes pour Débutants (AR 1-10)**\nCes commandes sont parfaites pour commencer votre aventure.',
      categories: [
        { name: '🎯 Essentiel', commands: beginnerCommands },
        { name: '📚 Aide', commands: alwaysAvailable }
      ]
    };
  }

  if (ar <= 25) {
    return {
      description: '🏗️ **Commandes Intermédiaires (AR 10-25)**\nVous avez accès à plus de contenu et fonctionnalités.',
      categories: [
        { name: '🎯 Essentiel', commands: beginnerCommands },
        { name: '⚔️ Combat & Guilde', commands: intermediateCommands },
        { name: '📚 Aide', commands: alwaysAvailable }
      ]
    };
  }

  if (ar <= 45) {
    return {
      description: '⚡ **Commandes Avancées (AR 25-45)**\nAccès au contenu avancé et aux événements.',
      categories: [
        { name: '🎯 Essentiel', commands: beginnerCommands },
        { name: '⚔️ Combat & Guilde', commands: intermediateCommands },
        { name: '🚀 Avancé', commands: advancedCommands },
        { name: '📚 Aide', commands: alwaysAvailable }
      ]
    };
  }

  return {
    description: '🏆 **Commandes Endgame (AR 45-60)**\nToutes les commandes sont disponibles.',
    categories: [
      { name: '🎯 Essentiel', commands: beginnerCommands },
      { name: '⚔️ Combat & Guilde', commands: intermediateCommands },
      { name: '🚀 Avancé', commands: advancedCommands },
      { name: '🏆 Endgame', commands: endgameCommands },
      { name: '📚 Aide', commands: alwaysAvailable }
    ]
  };
}
