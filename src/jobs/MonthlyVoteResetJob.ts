// import cron from 'node-cron'; // TODO: Install node-cron dependency
import { communityBannerService } from '../services/CommunityBannerService.js';
import { Banner } from '../database/models/index.js';
import { archivistService } from '../services/ArchivistService.js';

export class MonthlyVoteResetJob {
  // private static task: cron.ScheduledTask | null = null;

  /**
   * Démarre le job mensuel de réinitialisation des votes
   * S'exécute le 1er de chaque mois à minuit
   */
  static start(): void {
    // TODO: Implement cron scheduling after installing node-cron
    console.log('📅 Monthly Vote Reset Job - cron not configured (node-cron dependency missing)');
    /*
    this.task = cron.schedule('0 0 1 * *', async () => {
      await this.executeMonthlyReset();
    }, {
      timezone: 'UTC'
    });

    console.log('📅 Monthly Vote Reset Job started - will run on the 1st of each month at 00:00 UTC');
    */
  }

  /**
   * Arrête le job mensuel
   */
  static stop(): void {
    // TODO: Implement after installing node-cron
    console.log('📅 Monthly Vote Reset Job stopped');
    /*
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('📅 Monthly Vote Reset Job stopped');
    }
    */
  }

  /**
   * Exécute la réinitialisation mensuelle des votes
   */
  private static async executeMonthlyReset(): Promise<void> {
    console.log('🔄 Starting monthly vote reset...');

    try {
      // Récupérer toutes les guildes actives
      const guilds = await Banner.distinct('guildId');

      for (const guildId of guilds) {
        await this.processGuildReset(guildId as string);
      }

      console.log('✅ Monthly vote reset completed successfully');
    } catch (error) {
      console.error('❌ Error during monthly vote reset:', error);
    }
  }

  /**
   * Traite la réinitialisation pour une guilde spécifique
   */
  private static async processGuildReset(guildId: string): Promise<void> {
    try {
      console.log(`🔄 Processing guild ${guildId}...`);

      // 1. Terminer la période de vote et désigner le gagnant
      const votingResult = await communityBannerService.endVotingPeriod(guildId);
      
      if (votingResult.success && votingResult.winner) {
        console.log(`🏆 Winner for guild ${guildId}: ${votingResult.winner.bannerName} with ${votingResult.winner.votes} votes`);

        // 2. Activer la bannière gagnante
        await this.activateWinningBanner(votingResult.winner);

        // 3. Notifier l'Archiviste
        await archivistService.onServerMilestone('community_banner_winner', votingResult.winner.votes);
      } else {
        console.log(`ℹ️ No active voting period for guild ${guildId}`);
      }

      // 4. Réinitialiser les votes pour le nouveau cycle
      await communityBannerService.resetVotingCycle(guildId);
      console.log(`✅ Guild ${guildId} reset completed`);
    } catch (error) {
      console.error(`❌ Error processing guild ${guildId}:`, error);
    }
  }

  /**
   * Active la bannière gagnante
   */
  private static async activateWinningBanner(winner: any): Promise<void> {
    try {
      // Créer ou mettre à jour la bannière gagnante
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // Durée d'un mois

      const existingBanner = await Banner.findOne({ id: winner.bannerId });

      if (existingBanner) {
        await Banner.findOneAndUpdate(
          { id: winner.bannerId },
          {
            $set: {
              isActive: true,
              startDate,
              endDate,
              updatedAt: new Date()
            }
          }
        );
      } else {
        await Banner.create({
          id: winner.bannerId,
          name: winner.bannerName,
          type: winner.bannerType,
          description: winner.bannerDescription,
          featuredCharacters: winner.featuredCharacters,
          featuredWeapons: winner.featuredWeapons,
          startDate,
          endDate,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      console.log(`✅ Winning banner activated: ${winner.bannerName}`);
    } catch (error) {
      console.error('❌ Error activating winning banner:', error);
    }
  }

  /**
   * Exécute manuellement la réinitialisation (pour les tests)
   */
  static async executeManual(): Promise<void> {
    console.log('🔄 Executing manual monthly vote reset...');
    await this.executeMonthlyReset();
  }
}

export const monthlyVoteResetJob = MonthlyVoteResetJob;
