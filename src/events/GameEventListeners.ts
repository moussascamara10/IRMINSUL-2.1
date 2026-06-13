import { archivistService } from '../services/ArchivistService.js';
import { User } from '../database/models/index.js';

/**
 * Event listeners pour les événements de jeu importants
 * Ces listeners sont appelés lors des actions significatives dans le jeu
 */

export class GameEventListeners {
  /**
   * Appelé lorsqu'un joueur obtient un personnage 5★
   */
  static async onFiveStarPull(userId: string, username: string, characterName: string, element: string): Promise<void> {
    try {
      // Notifier l'Archiviste
      await archivistService.onFiveStarObtained(userId, username, characterName, element);

      // Mettre à jour les statistiques du joueur
      await User.findOneAndUpdate(
        { discordId: userId },
        {
          $inc: {
            totalPulls: 1,
            dryStreak: 0, // Reset la série sèche
            compassionBonus: 0 // Reset le bonus de compassion
          }
        }
      );

      // Vérifier les jalons de serveur
      await this.checkServerMilestones('pulls');
    } catch (error) {
      console.error('Error in onFiveStarPull:', error);
    }
  }

  /**
   * Appelé lorsqu'un joueur effectue un pull sans 5★
   */
  static async onNonFiveStarPull(userId: string): Promise<void> {
    try {
      // Incrémenter la série sèche
      const user = await User.findOne({ discordId: userId });
      if (!user) return;

      const newDryStreak = user.dryStreak + 1;
      let newCompassionBonus = 0;

      // Calculer le bonus de compassion (max 0.5 = +50% taux de base)
      if (newDryStreak >= 50) {
        newCompassionBonus = 0.5;
      } else if (newDryStreak >= 30) {
        newCompassionBonus = 0.3;
      } else if (newDryStreak >= 20) {
        newCompassionBonus = 0.2;
      } else if (newDryStreak >= 10) {
        newCompassionBonus = 0.1;
      }

      await User.findOneAndUpdate(
        { discordId: userId },
        {
          $set: {
            dryStreak: newDryStreak,
            compassionBonus: newCompassionBonus
          },
          $inc: { totalPulls: 1 }
        }
      );

      // Vérifier les jalons de serveur
      await this.checkServerMilestones('pulls');
    } catch (error) {
      console.error('Error in onNonFiveStarPull:', error);
    }
  }

  /**
   * Appelé lorsqu'un joueur vainc un boss
   */
  static async onBossDefeated(userId: string, username: string, bossName: string, turns: number): Promise<void> {
    try {
      // Notifier l'Archiviste
      await archivistService.onBossDefeated(userId, username, bossName, turns);

      // Vérifier les jalons de serveur
      await this.checkServerMilestones('boss_kills');
    } catch (error) {
      console.error('Error in onBossDefeated:', error);
    }
  }

  /**
   * Appelé lorsqu'un joueur monte de niveau (AR)
   */
  static async onPlayerLevelUp(userId: string, username: string, newAR: number): Promise<void> {
    try {
      // Notifier l'Archiviste
      await archivistService.onPlayerLevelUp(username, newAR);

      // Vérifier les jalons de serveur
      await this.checkServerMilestones('players');
    } catch (error) {
      console.error('Error in onPlayerLevelUp:', error);
    }
  }

  /**
   * Vérifie les jalons de serveur et notifie l'Archiviste si atteints
   */
  private static async checkServerMilestones(type: 'pulls' | 'boss_kills' | 'players'): Promise<void> {
    try {
      const totalUsers = await User.countDocuments();
      const totalPulls = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$totalPulls' } } }
      ]);

      let milestone: string | null = null;
      let value: number = 0;

      switch (type) {
        case 'pulls':
          const totalPullsValue = totalPulls[0]?.total || 0;
          if (totalPullsValue === 100) {
            milestone = 'pulls_100';
            value = totalPullsValue;
          } else if (totalPullsValue === 1000) {
            milestone = 'pulls_1000';
            value = totalPullsValue;
          } else if (totalPullsValue === 10000) {
            milestone = 'pulls_10000';
            value = totalPullsValue;
          }
          break;
        case 'boss_kills':
          // À implémenter avec un compteur de boss kills
          break;
        case 'players':
          if (totalUsers === 10) {
            milestone = 'players_10';
            value = totalUsers;
          } else if (totalUsers === 50) {
            milestone = 'players_50';
            value = totalUsers;
          }
          break;
      }

      if (milestone) {
        await archivistService.onServerMilestone(milestone, value);
      }
    } catch (error) {
      console.error('Error in checkServerMilestones:', error);
    }
  }
}

export const gameEventListeners = GameEventListeners;
