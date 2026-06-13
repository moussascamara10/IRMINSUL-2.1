import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunityBannerVote extends Document {
  guildId: string;
  bannerId: string;
  bannerName: string;
  bannerDescription: string;
  bannerType: 'character' | 'weapon';
  featuredCharacters?: string[];
  featuredWeapons?: string[];
  votes: number;
  voters: string[]; // Array of userIds who voted
  votingStartDate: Date;
  votingEndDate: Date;
  isActive: boolean;
  isWinner: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommunityBannerVoteSchema = new Schema<ICommunityBannerVote>({
  guildId: { type: String, required: true, index: true },
  bannerId: { type: String, required: true, unique: true },
  bannerName: { type: String, required: true },
  bannerDescription: { type: String, required: true },
  bannerType: { type: String, required: true, enum: ['character', 'weapon'] },
  featuredCharacters: [{ type: String }],
  featuredWeapons: [{ type: String }],
  votes: { type: Number, default: 0, min: 0 },
  voters: [{ type: String }],
  votingStartDate: { type: Date, required: true },
  votingEndDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  isWinner: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CommunityBannerVoteSchema.index({ guildId: 1, isActive: 1 });
CommunityBannerVoteSchema.index({ votingEndDate: 1 });

export const CommunityBannerVote = mongoose.model<ICommunityBannerVote>('CommunityBannerVote', CommunityBannerVoteSchema);

export class CommunityBannerService {
  private static readonly VOTING_PERIOD_DAYS = 3;

  /**
   * Crée une nouvelle proposition de bannière communautaire
   */
  static async createBannerProposal(data: {
    guildId: string;
    bannerId: string;
    bannerName: string;
    bannerDescription: string;
    bannerType: 'character' | 'weapon';
    featuredCharacters?: string[];
    featuredWeapons?: string[];
  }): Promise<{ success: boolean; proposal?: ICommunityBannerVote; error?: string }> {
    try {
      const votingStartDate = new Date();
      const votingEndDate = new Date();
      votingEndDate.setDate(votingEndDate.getDate() + this.VOTING_PERIOD_DAYS);

      const proposal = await CommunityBannerVote.create({
        guildId: data.guildId,
        bannerId: data.bannerId,
        bannerName: data.bannerName,
        bannerDescription: data.bannerDescription,
        bannerType: data.bannerType,
        featuredCharacters: data.featuredCharacters,
        featuredWeapons: data.featuredWeapons,
        votingStartDate,
        votingEndDate,
        isActive: true,
        isWinner: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return { success: true, proposal };
    } catch (error) {
      return { success: false, error: 'Erreur lors de la création de la proposition' };
    }
  }

  /**
   * Vote pour une bannière communautaire
   */
  static async voteForBanner(userId: string, bannerId: string): Promise<{ success: boolean; message: string; votes?: number }> {
    try {
      const proposal = await CommunityBannerVote.findOne({ bannerId, isActive: true });
      if (!proposal) {
        return { success: false, message: 'Proposition de bannière non trouvée ou terminée' };
      }

      // Vérifier si le vote est toujours ouvert
      if (new Date() > proposal.votingEndDate) {
        return { success: false, message: 'La période de vote est terminée' };
      }

      // Vérifier si l'utilisateur a déjà voté
      if (proposal.voters.includes(userId)) {
        return { success: false, message: 'Vous avez déjà voté pour cette bannière' };
      }

      // Ajouter le vote
      await CommunityBannerVote.findOneAndUpdate(
        { bannerId },
        {
          $inc: { votes: 1 },
          $push: { voters: userId },
          $set: { updatedAt: new Date() }
        }
      );

      const updated = await CommunityBannerVote.findOne({ bannerId });
      return { success: true, message: 'Vote enregistré avec succès!', votes: updated?.votes };
    } catch (error) {
      return { success: false, message: 'Erreur lors du vote' };
    }
  }

  /**
   * Annule le vote d'un utilisateur
   */
  static async removeVote(userId: string, bannerId: string): Promise<{ success: boolean; message: string; votes?: number }> {
    try {
      const proposal = await CommunityBannerVote.findOne({ bannerId, isActive: true });
      if (!proposal) {
        return { success: false, message: 'Proposition de bannière non trouvée ou terminée' };
      }

      // Vérifier si le vote est toujours ouvert
      if (new Date() > proposal.votingEndDate) {
        return { success: false, message: 'La période de vote est terminée' };
      }

      // Vérifier si l'utilisateur a voté
      if (!proposal.voters.includes(userId)) {
        return { success: false, message: 'Vous n\'avez pas voté pour cette bannière' };
      }

      // Retirer le vote
      await CommunityBannerVote.findOneAndUpdate(
        { bannerId },
        {
          $inc: { votes: -1 },
          $pull: { voters: userId },
          $set: { updatedAt: new Date() }
        }
      );

      const updated = await CommunityBannerVote.findOne({ bannerId });
      return { success: true, message: 'Vote annulé avec succès!', votes: updated?.votes };
    } catch (error) {
      return { success: false, message: 'Erreur lors de l\'annulation du vote' };
    }
  }

  /**
   * Récupère toutes les propositions actives pour une guilde
   */
  static async getActiveProposals(guildId: string): Promise<ICommunityBannerVote[]> {
    return await CommunityBannerVote.find({
      guildId,
      isActive: true,
      votingEndDate: { $gte: new Date() }
    }).sort({ votes: -1 });
  }

  /**
   * Récupère les résultats du vote pour une guilde
   */
  static async getVotingResults(guildId: string): Promise<{ winner?: ICommunityBannerVote; allProposals: ICommunityBannerVote[] }> {
    const allProposals = await CommunityBannerVote.find({
      guildId,
      isActive: true,
      votingEndDate: { $lte: new Date() }
    }).sort({ votes: -1 });

    const winner = allProposals.length > 0 ? allProposals[0] : undefined;
    return { winner, allProposals };
  }

  /**
   * Termine la période de vote et désigne le gagnant
   */
  static async endVotingPeriod(guildId: string): Promise<{ success: boolean; winner?: ICommunityBannerVote; message: string }> {
    try {
      const proposals = await CommunityBannerVote.find({
        guildId,
        isActive: true,
        votingEndDate: { $lte: new Date() }
      }).sort({ votes: -1 });

      if (proposals.length === 0) {
        return { success: false, message: 'Aucune proposition de bannière trouvée' };
      }

      const winner = proposals[0];

      // Marquer le gagnant et désactiver toutes les propositions
      await CommunityBannerVote.updateMany(
        { guildId, isActive: true, votingEndDate: { $lte: new Date() } },
        {
          $set: {
            isActive: false,
            isWinner: false,
            updatedAt: new Date()
          }
        }
      );

      await CommunityBannerVote.findOneAndUpdate(
        { bannerId: winner.bannerId },
        { $set: { isWinner: true, updatedAt: new Date() } }
      );

      return { success: true, winner, message: 'Vote terminé avec succès!' };
    } catch (error) {
      return { success: false, message: 'Erreur lors de la fin du vote' };
    }
  }

  /**
   * Réinitialise les votes pour un nouveau cycle
   */
  static async resetVotingCycle(guildId: string): Promise<{ success: boolean; message: string }> {
    try {
      await CommunityBannerVote.updateMany(
        { guildId },
        {
          $set: {
            isActive: false,
            isWinner: false,
            votes: 0,
            voters: [],
            updatedAt: new Date()
          }
        }
      );

      return { success: true, message: 'Cycle de vote réinitialisé avec succès' };
    } catch (error) {
      return { success: false, message: 'Erreur lors de la réinitialisation' };
    }
  }

  /**
   * Vérifie si une période de vote est active
   */
  static async isVotingActive(guildId: string): Promise<boolean> {
    const activeProposal = await CommunityBannerVote.findOne({
      guildId,
      isActive: true,
      votingEndDate: { $gte: new Date() }
    });
    return activeProposal !== null;
  }

  /**
   * Récupère les statistiques de vote pour une guilde
   */
  static async getVotingStats(guildId: string): Promise<{
    totalProposals: number;
    totalVotes: number;
    activeProposals: number;
    votingActive: boolean;
    timeRemaining?: number;
  }> {
    const totalProposals = await CommunityBannerVote.countDocuments({ guildId });
    const activeProposals = await CommunityBannerVote.countDocuments({
      guildId,
      isActive: true,
      votingEndDate: { $gte: new Date() }
    });

    const totalVotes = await CommunityBannerVote.aggregate([
      { $match: { guildId } },
      { $group: { _id: null, total: { $sum: '$votes' } } }
    ]);

    const votingActive = await this.isVotingActive(guildId);
    let timeRemaining: number | undefined;

    if (votingActive) {
      const activeProposal = await CommunityBannerVote.findOne({
        guildId,
        isActive: true,
        votingEndDate: { $gte: new Date() }
      }).sort({ votingEndDate: 1 });
      
      if (activeProposal) {
        timeRemaining = activeProposal.votingEndDate.getTime() - Date.now();
      }
    }

    return {
      totalProposals,
      totalVotes: totalVotes[0]?.total || 0,
      activeProposals,
      votingActive,
      timeRemaining
    };
  }
}

export const communityBannerService = CommunityBannerService;
