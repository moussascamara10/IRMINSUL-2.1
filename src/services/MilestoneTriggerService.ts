import { serverConfigService } from '../database/models/index.js';
import { archivistService } from './ArchivistService.js';
import { User } from '../database/models/index.js';

export interface IMilestone {
  milestoneId: string;
  name: string;
  description: string;
  type: 'pulls' | 'players' | 'boss_kills' | 'mora';
  threshold: number;
  unlocked: boolean;
  unlockedAt?: Date;
  rewards: {
    serverBonus: number; // Bonus pour tous les joueurs
    announcement: boolean; // Annonce publique
  };
}

export class MilestoneTriggerService {
  private static milestones: IMilestone[] = [
    {
      milestoneId: 'milestone_pulls_100',
      name: 'Premiers Vœux',
      description: '100 vœux formulés sur le serveur',
      type: 'pulls',
      threshold: 100,
      unlocked: false,
      rewards: { serverBonus: 0.05, announcement: true }
    },
    {
      milestoneId: 'milestone_pulls_1000',
      name: 'Vœux Déterminés',
      description: '1000 vœux formulés sur le serveur',
      type: 'pulls',
      threshold: 1000,
      unlocked: false,
      rewards: { serverBonus: 0.1, announcement: true }
    },
    {
      milestoneId: 'milestone_pulls_10000',
      name: 'Légende des Vœux',
      description: '10000 vœux formulés sur le serveur',
      type: 'pulls',
      threshold: 10000,
      unlocked: false,
      rewards: { serverBonus: 0.2, announcement: true }
    },
    {
      milestoneId: 'milestone_players_10',
      name: 'Premiers Voyageurs',
      description: '10 joueurs sur le serveur',
      type: 'players',
      threshold: 10,
      unlocked: false,
      rewards: { serverBonus: 0.03, announcement: true }
    },
    {
      milestoneId: 'milestone_players_50',
      name: 'Communauté Croissante',
      description: '50 joueurs sur le serveur',
      type: 'players',
      threshold: 50,
      unlocked: false,
      rewards: { serverBonus: 0.07, announcement: true }
    },
    {
      milestoneId: 'milestone_players_100',
      name: 'Grande Communauté',
      description: '100 joueurs sur le serveur',
      type: 'players',
      threshold: 100,
      unlocked: false,
      rewards: { serverBonus: 0.15, announcement: true }
    },
    {
      milestoneId: 'milestone_boss_kills_100',
      name: 'Chasseurs de Boss',
      description: '100 boss vaincus sur le serveur',
      type: 'boss_kills',
      threshold: 100,
      unlocked: false,
      rewards: { serverBonus: 0.05, announcement: true }
    },
    {
      milestoneId: 'milestone_boss_kills_500',
      name: 'Maîtres de l\'Abîme',
      description: '500 boss vaincus sur le serveur',
      type: 'boss_kills',
      threshold: 500,
      unlocked: false,
      rewards: { serverBonus: 0.12, announcement: true }
    },
    {
      milestoneId: 'milestone_mora_1m',
      name: 'Richesse Naissante',
      description: '1M Mora total sur le serveur',
      type: 'mora',
      threshold: 1000000,
      unlocked: false,
      rewards: { serverBonus: 0.04, announcement: true }
    },
    {
      milestoneId: 'milestone_mora_10m',
      name: 'Richesse de Liyue',
      description: '10M Mora total sur le serveur',
      type: 'mora',
      threshold: 10000000,
      unlocked: false,
      rewards: { serverBonus: 0.1, announcement: true }
    }
  ];

  /**
   * Vérifie les jalons après un événement spécifique
   */
  static async checkMilestones(guildId: string, eventType: 'pull' | 'player_join' | 'boss_kill' | 'mora_earned'): Promise<{ unlocked: IMilestone[] }> {
    const unlocked: IMilestone[] = [];

    try {
      // Récupérer les statistiques actuelles du serveur
      const totalUsers = await User.countDocuments({ guildId });
      const totalPulls = await User.aggregate([
        { $match: { guildId } },
        { $group: { _id: null, total: { $sum: '$totalPulls' } } }
      ]);
      const totalMora = await User.aggregate([
        { $match: { guildId } },
        { $group: { _id: null, total: { $sum: '$mora' } } }
      ]);

      const stats = {
        totalPulls: totalPulls[0]?.total || 0,
        totalPlayers: totalUsers,
        totalBossKills: 0, // À implémenter avec un compteur de boss
        totalMora: totalMora[0]?.total || 0
      };

      // Mettre à jour les statistiques du serveur
      await serverConfigService.updateServerStats(guildId, stats);

      // Vérifier les jalons pertinents
      const relevantMilestones = this.milestones.filter(m => 
        !m.unlocked && this.isMilestoneRelevant(m, eventType)
      );

      for (const milestone of relevantMilestones) {
        const currentValue = this.getCurrentValue(milestone, stats);
        
        if (currentValue >= milestone.threshold) {
          await this.unlockMilestone(guildId, milestone);
          unlocked.push({ ...milestone, unlocked: true, unlockedAt: new Date() });
        }
      }

      // Vérifier les constellations de serveur
      const constellationResult = await serverConfigService.checkAndUnlockConstellations(guildId);
      if (constellationResult.unlocked.length > 0) {
        console.log(`🌟 ${constellationResult.unlocked.length} constellation(s) débloquée(s) pour le serveur ${guildId}`);
      }

    } catch (error) {
      console.error('Error checking milestones:', error);
    }

    return { unlocked };
  }

  /**
   * Détermine si un jalon est pertinent pour l'événement
   */
  private static isMilestoneRelevant(milestone: IMilestone, eventType: string): boolean {
    switch (eventType) {
      case 'pull':
        return milestone.type === 'pulls';
      case 'player_join':
        return milestone.type === 'players';
      case 'boss_kill':
        return milestone.type === 'boss_kills';
      case 'mora_earned':
        return milestone.type === 'mora';
      default:
        return false;
    }
  }

  /**
   * Récupère la valeur actuelle pour un jalon
   */
  private static getCurrentValue(milestone: IMilestone, stats: any): number {
    switch (milestone.type) {
      case 'pulls':
        return stats.totalPulls;
      case 'players':
        return stats.totalPlayers;
      case 'boss_kills':
        return stats.totalBossKills;
      case 'mora':
        return stats.totalMora;
      default:
        return 0;
    }
  }

  /**
   * Débloque un jalon et applique les récompenses
   */
  private static async unlockMilestone(guildId: string, milestone: IMilestone): Promise<void> {
    try {
      // Marquer le jalon comme débloqué
      const milestoneIndex = this.milestones.findIndex(m => m.milestoneId === milestone.milestoneId);
      if (milestoneIndex !== -1) {
        this.milestones[milestoneIndex].unlocked = true;
        this.milestones[milestoneIndex].unlockedAt = new Date();
      }

      // Appliquer les récompenses
      if (milestone.rewards.announcement) {
        await archivistService.onServerMilestone(milestone.milestoneId, milestone.threshold);
      }

      // Appliquer le bonus de serveur
      if (milestone.rewards.serverBonus > 0) {
        // Le bonus sera appliqué automatiquement via serverConfigService.getActiveBonuses()
        console.log(`💰 Server bonus ${milestone.rewards.serverBonus * 100}% applied for milestone ${milestone.milestoneId}`);
      }

      console.log(`🎉 Milestone unlocked: ${milestone.name} for guild ${guildId}`);
    } catch (error) {
      console.error('Error unlocking milestone:', error);
    }
  }

  /**
   * Récupère tous les jalons
   */
  static getAllMilestones(): IMilestone[] {
    return this.milestones;
  }

  /**
   * Récupère les jalons débloqués
   */
  static getUnlockedMilestones(): IMilestone[] {
    return this.milestones.filter(m => m.unlocked);
  }

  /**
   * Récupère les jalons en attente
   */
  static getPendingMilestones(): IMilestone[] {
    return this.milestones.filter(m => !m.unlocked);
  }

  /**
   * Réinitialise tous les jalons (pour les tests)
   */
  static resetMilestones(): void {
    this.milestones.forEach(m => {
      m.unlocked = false;
      m.unlockedAt = undefined;
    });
  }

  /**
   * Récupère la progression vers un jalon spécifique
   */
  static async getMilestoneProgress(guildId: string, milestoneId: string): Promise<{ current: number; threshold: number; percentage: number }> {
    const milestone = this.milestones.find(m => m.milestoneId === milestoneId);
    if (!milestone) {
      return { current: 0, threshold: 0, percentage: 0 };
    }

    const totalUsers = await User.countDocuments({ guildId });
    const totalPulls = await User.aggregate([
      { $match: { guildId } },
      { $group: { _id: null, total: { $sum: '$totalPulls' } } }
    ]);
    const totalMora = await User.aggregate([
      { $match: { guildId } },
      { $group: { _id: null, total: { $sum: '$mora' } } }
    ]);

    const stats = {
      totalPulls: totalPulls[0]?.total || 0,
      totalPlayers: totalUsers,
      totalBossKills: 0,
      totalMora: totalMora[0]?.total || 0
    };

    const current = this.getCurrentValue(milestone, stats);
    const percentage = Math.min((current / milestone.threshold) * 100, 100);

    return { current, threshold: milestone.threshold, percentage };
  }
}

export const milestoneTriggerService = MilestoneTriggerService;
