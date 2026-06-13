import mongoose, { ClientSession } from 'mongoose';
import { User } from '../database/models/index.js';

export class TransactionService {
  /**
   * Exécute une transaction MongoDB pour les opérations économiques
   */
  static async executeTransaction<T>(
    operation: (session: ClientSession) => Promise<T>
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const result = await operation(session);
      
      await session.commitTransaction();
      
      return { success: true, result };
    } catch (error) {
      await session.abortTransaction();
      console.error('Transaction failed:', error);
      return { success: false, error: 'Transaction failed' };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Transfère du Mora d'un utilisateur à un autre de manière atomique
   */
  static async transferMora(
    fromUserId: string,
    toUserId: string,
    amount: number,
    session?: ClientSession
  ): Promise<{ success: boolean; error?: string }> {
    const useSession = session || await mongoose.startSession();
    const shouldEndSession = !session;

    try {
      if (shouldEndSession) {
        useSession.startTransaction();
      }

      // Vérifier que l'expéditeur a assez de Mora
      const sender = await User.findOne({ discordId: fromUserId }).session(useSession);
      if (!sender || sender.mora < amount) {
        if (shouldEndSession) {
          await useSession.abortTransaction();
          await useSession.endSession();
        }
        return { success: false, error: 'Solde insuffisant' };
      }

      // Déduire le Mora de l'expéditeur
      await User.findOneAndUpdate(
        { discordId: fromUserId },
        { $inc: { mora: -amount } },
        { session: useSession }
      );

      // Ajouter le Mora au destinataire
      await User.findOneAndUpdate(
        { discordId: toUserId },
        { $inc: { mora: amount } },
        { session: useSession }
      );

      if (shouldEndSession) {
        await useSession.commitTransaction();
        await useSession.endSession();
      }

      return { success: true };
    } catch (error) {
      if (shouldEndSession) {
        await useSession.abortTransaction();
        await useSession.endSession();
      }
      console.error('Mora transfer failed:', error);
      return { success: false, error: 'Erreur lors du transfert' };
    }
  }

  /**
   * Transfère des Primogens d'un utilisateur à un autre de manière atomique
   */
  static async transferPrimogens(
    fromUserId: string,
    toUserId: string,
    amount: number,
    session?: ClientSession
  ): Promise<{ success: boolean; error?: string }> {
    const useSession = session || await mongoose.startSession();
    const shouldEndSession = !session;

    try {
      if (shouldEndSession) {
        useSession.startTransaction();
      }

      // Vérifier que l'expéditeur a assez de Primogens
      const sender = await User.findOne({ discordId: fromUserId }).session(useSession);
      if (!sender || sender.primogens < amount) {
        if (shouldEndSession) {
          await useSession.abortTransaction();
          await useSession.endSession();
        }
        return { success: false, error: 'Solde insuffisant' };
      }

      // Déduire les Primogens de l'expéditeur
      await User.findOneAndUpdate(
        { discordId: fromUserId },
        { $inc: { primogens: -amount } },
        { session: useSession }
      );

      // Ajouter les Primogens au destinataire
      await User.findOneAndUpdate(
        { discordId: toUserId },
        { $inc: { primogens: amount } },
        { session: useSession }
      );

      if (shouldEndSession) {
        await useSession.commitTransaction();
        await useSession.endSession();
      }

      return { success: true };
    } catch (error) {
      if (shouldEndSession) {
        await useSession.abortTransaction();
        await useSession.endSession();
      }
      console.error('Primogen transfer failed:', error);
      return { success: false, error: 'Erreur lors du transfert' };
    }
  }

  /**
   * Effectue un achat avec vérification de solde et déduction atomique
   */
  static async purchaseItem(
    userId: string,
    cost: { mora?: number; primogens?: number; fatesIntertwined?: number; fatesAcquaint?: number },
    session?: ClientSession
  ): Promise<{ success: boolean; error?: string }> {
    const useSession = session || await mongoose.startSession();
    const shouldEndSession = !session;

    try {
      if (shouldEndSession) {
        useSession.startTransaction();
      }

      // Vérifier le solde
      const user = await User.findOne({ discordId: userId }).session(useSession);
      if (!user) {
        if (shouldEndSession) {
          await useSession.abortTransaction();
          await useSession.endSession();
        }
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      if (cost.mora && user.mora < cost.mora) {
        if (shouldEndSession) {
          await useSession.abortTransaction();
          await useSession.endSession();
        }
        return { success: false, error: 'Mora insuffisant' };
      }

      if (cost.primogens && user.primogens < cost.primogens) {
        if (shouldEndSession) {
          await useSession.abortTransaction();
          await useSession.endSession();
        }
        return { success: false, error: 'Primogens insuffisants' };
      }

      if (cost.fatesIntertwined && user.fatesIntertwined < cost.fatesIntertwined) {
        if (shouldEndSession) {
          await useSession.abortTransaction();
          await useSession.endSession();
        }
        return { success: false, error: 'Destins Enchevêtrés insuffisants' };
      }

      if (cost.fatesAcquaint && user.fatesAcquaint < cost.fatesAcquaint) {
        if (shouldEndSession) {
          await useSession.abortTransaction();
          await useSession.endSession();
        }
        return { success: false, error: 'Destins Entrelacés insuffisants' };
      }

      // Déduire les coûts
      const updateData: any = {};
      if (cost.mora) updateData.mora = -cost.mora;
      if (cost.primogens) updateData.primogens = -cost.primogens;
      if (cost.fatesIntertwined) updateData.fatesIntertwined = -cost.fatesIntertwined;
      if (cost.fatesAcquaint) updateData.fatesAcquaint = -cost.fatesAcquaint;

      await User.findOneAndUpdate(
        { discordId: userId },
        { $inc: updateData },
        { session: useSession }
      );

      if (shouldEndSession) {
        await useSession.commitTransaction();
        await useSession.endSession();
      }

      return { success: true };
    } catch (error) {
      if (shouldEndSession) {
        await useSession.abortTransaction();
        await useSession.endSession();
      }
      console.error('Purchase failed:', error);
      return { success: false, error: 'Erreur lors de l\'achat' };
    }
  }

  /**
   * Ajoute des récompenses à un utilisateur de manière atomique
   */
  static async addRewards(
    userId: string,
    rewards: { mora?: number; primogens?: number; fatesIntertwined?: number; fatesAcquaint?: number; starglitter?: number; stardust?: number },
    session?: ClientSession
  ): Promise<{ success: boolean; error?: string }> {
    const useSession = session || await mongoose.startSession();
    const shouldEndSession = !session;

    try {
      if (shouldEndSession) {
        useSession.startTransaction();
      }

      const updateData: any = {};
      if (rewards.mora) updateData.mora = rewards.mora;
      if (rewards.primogens) updateData.primogens = rewards.primogens;
      if (rewards.fatesIntertwined) updateData.fatesIntertwined = rewards.fatesIntertwined;
      if (rewards.fatesAcquaint) updateData.fatesAcquaint = rewards.fatesAcquaint;
      if (rewards.starglitter) updateData.starglitter = rewards.starglitter;
      if (rewards.stardust) updateData.stardust = rewards.stardust;

      await User.findOneAndUpdate(
        { discordId: userId },
        { $inc: updateData },
        { session: useSession }
      );

      if (shouldEndSession) {
        await useSession.commitTransaction();
        await useSession.endSession();
      }

      return { success: true };
    } catch (error) {
      if (shouldEndSession) {
        await useSession.abortTransaction();
        await useSession.endSession();
      }
      console.error('Reward addition failed:', error);
      return { success: false, error: 'Erreur lors de l\'ajout des récompenses' };
    }
  }
}

export const transactionService = TransactionService;
