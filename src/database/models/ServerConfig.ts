import mongoose, { Schema, Document } from 'mongoose';

export interface IServerConstellation {
  constellationId: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  unlocked: boolean;
  unlockedAt?: Date;
  requirements: {
    totalPulls?: number;
    totalPlayers?: number;
    totalBossKills?: number;
    totalMora?: number;
  };
  rewards: {
    moraBonus?: number; // Bonus de Mora pour tous les joueurs
    primogenBonus?: number; // Bonus de Primogènes pour tous les joueurs
    resinBonus?: number; // Bonus de Résine
    xpBonus?: number; // Bonus d'XP
  };
  progress: {
    currentPulls?: number;
    currentPlayers?: number;
    currentBossKills?: number;
    currentMora?: number;
  };
}

export interface IServerConfig extends Document {
  guildId: string;
  serverName: string;
  totalPulls: number;
  totalPlayers: number;
  totalBossKills: number;
  totalMora: number;
  constellations: IServerConstellation[];
  createdAt: Date;
  updatedAt: Date;
}

const ServerConstellationSchema = new Schema<IServerConstellation>({
  constellationId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  level: { type: Number, default: 0, min: 0 },
  maxLevel: { type: Number, default: 5, min: 1 },
  unlocked: { type: Boolean, default: false },
  unlockedAt: Date,
  requirements: {
    totalPulls: { type: Number, default: 0 },
    totalPlayers: { type: Number, default: 0 },
    totalBossKills: { type: Number, default: 0 },
    totalMora: { type: Number, default: 0 }
  },
  rewards: {
    moraBonus: { type: Number, default: 0 },
    primogenBonus: { type: Number, default: 0 },
    resinBonus: { type: Number, default: 0 },
    xpBonus: { type: Number, default: 0 }
  },
  progress: {
    currentPulls: { type: Number, default: 0 },
    currentPlayers: { type: Number, default: 0 },
    currentBossKills: { type: Number, default: 0 },
    currentMora: { type: Number, default: 0 }
  }
});

const ServerConfigSchema = new Schema<IServerConfig>({
  guildId: { type: String, required: true, unique: true, index: true },
  serverName: { type: String, required: true },
  totalPulls: { type: Number, default: 0, min: 0 },
  totalPlayers: { type: Number, default: 0, min: 0 },
  totalBossKills: { type: Number, default: 0, min: 0 },
  totalMora: { type: Number, default: 0, min: 0 },
  constellations: [ServerConstellationSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ServerConfigSchema.index({ guildId: 1 });
ServerConfigSchema.index({ 'constellations.unlocked': 1 });

export const ServerConfig = mongoose.model<IServerConfig>('ServerConfig', ServerConfigSchema);

export class ServerConfigService {
  /**
   * Crée ou met à jour la configuration d'un serveur
   */
  static async getOrCreateServerConfig(guildId: string, serverName: string): Promise<IServerConfig> {
    let config = await ServerConfig.findOne({ guildId });
    
    if (!config) {
      config = await ServerConfig.create({
        guildId,
        serverName,
        totalPulls: 0,
        totalPlayers: 0,
        totalBossKills: 0,
        totalMora: 0,
        constellations: this.getDefaultConstellations(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return config;
  }

  /**
   * Récupère les constellations par défaut
   */
  private static getDefaultConstellations(): IServerConstellation[] {
    return [
      {
        constellationId: 'constellation_1',
        name: 'Étoile du Matin',
        description: 'Premiers pas dans Teyvat - 100 pulls sur le serveur',
        level: 0,
        maxLevel: 5,
        unlocked: false,
        requirements: { totalPulls: 100 },
        rewards: { moraBonus: 0.05, primogenBonus: 0 },
        progress: { currentPulls: 0 }
      },
      {
        constellationId: 'constellation_2',
        name: 'Éclat de Lumière',
        description: 'Communauté grandissante - 50 joueurs sur le serveur',
        level: 0,
        maxLevel: 5,
        unlocked: false,
        requirements: { totalPlayers: 50 },
        rewards: { moraBonus: 0.1, primogenBonus: 0.01 },
        progress: { currentPlayers: 0 }
      },
      {
        constellationId: 'constellation_3',
        name: 'Guerrier de l\'Abîme',
        description: 'Chasseurs de boss - 100 boss vaincus sur le serveur',
        level: 0,
        maxLevel: 5,
        unlocked: false,
        requirements: { totalBossKills: 100 },
        rewards: { moraBonus: 0.15, resinBonus: 5 },
        progress: { currentBossKills: 0 }
      },
      {
        constellationId: 'constellation_4',
        name: 'Richesse de Liyue',
        description: 'Prospérité économique - 10M Mora total sur le serveur',
        level: 0,
        maxLevel: 5,
        unlocked: false,
        requirements: { totalMora: 10000000 },
        rewards: { moraBonus: 0.2, xpBonus: 0.1 },
        progress: { currentMora: 0 }
      },
      {
        constellationId: 'constellation_5',
        name: 'Constellation Ultime',
        description: 'Légende de Teyvat - 1000 pulls sur le serveur',
        level: 0,
        maxLevel: 5,
        unlocked: false,
        requirements: { totalPulls: 1000 },
        rewards: { moraBonus: 0.3, primogenBonus: 0.05, resinBonus: 10 },
        progress: { currentPulls: 0 }
      }
    ];
  }

  /**
   * Met à jour les statistiques du serveur
   */
  static async updateServerStats(guildId: string, stats: {
    totalPulls?: number;
    totalPlayers?: number;
    totalBossKills?: number;
    totalMora?: number;
  }): Promise<void> {
    const updateData: any = { $set: { updatedAt: new Date() } };
    
    if (stats.totalPulls !== undefined) {
      updateData.$set.totalPulls = stats.totalPulls;
      updateData.$set['constellations.$.progress.currentPulls'] = stats.totalPulls;
    }
    if (stats.totalPlayers !== undefined) {
      updateData.$set.totalPlayers = stats.totalPlayers;
      updateData.$set['constellations.$.progress.currentPlayers'] = stats.totalPlayers;
    }
    if (stats.totalBossKills !== undefined) {
      updateData.$set.totalBossKills = stats.totalBossKills;
      updateData.$set['constellations.$.progress.currentBossKills'] = stats.totalBossKills;
    }
    if (stats.totalMora !== undefined) {
      updateData.$set.totalMora = stats.totalMora;
      updateData.$set['constellations.$.progress.currentMora'] = stats.totalMora;
    }

    await ServerConfig.findOneAndUpdate({ guildId }, updateData);
  }

  /**
   * Vérifie et débloque les constellations
   */
  static async checkAndUnlockConstellations(guildId: string): Promise<{ unlocked: IServerConstellation[] }> {
    const config = await ServerConfig.findOne({ guildId });
    if (!config) {
      return { unlocked: [] };
    }

    const unlocked: IServerConstellation[] = [];

    for (const constellation of config.constellations) {
      if (constellation.unlocked) continue;

      let shouldUnlock = false;

      if (constellation.requirements.totalPulls && config.totalPulls >= constellation.requirements.totalPulls) {
        shouldUnlock = true;
      }
      if (constellation.requirements.totalPlayers && config.totalPlayers >= constellation.requirements.totalPlayers) {
        shouldUnlock = true;
      }
      if (constellation.requirements.totalBossKills && config.totalBossKills >= constellation.requirements.totalBossKills) {
        shouldUnlock = true;
      }
      if (constellation.requirements.totalMora && config.totalMora >= constellation.requirements.totalMora) {
        shouldUnlock = true;
      }

      if (shouldUnlock) {
        await ServerConfig.findOneAndUpdate(
          { guildId, 'constellations.constellationId': constellation.constellationId },
          {
            $set: {
              'constellations.$.unlocked': true,
              'constellations.$.unlockedAt': new Date(),
              'constellations.$.level': 1,
              updatedAt: new Date()
            }
          }
        );
        unlocked.push({ ...constellation, unlocked: true, unlockedAt: new Date(), level: 1 });
      }
    }

    return { unlocked };
  }

  /**
   * Récupère les bonus actifs pour un serveur
   */
  static async getActiveBonuses(guildId: string): Promise<{
    moraBonus: number;
    primogenBonus: number;
    resinBonus: number;
    xpBonus: number;
  }> {
    const config = await ServerConfig.findOne({ guildId });
    if (!config) {
      return { moraBonus: 0, primogenBonus: 0, resinBonus: 0, xpBonus: 0 };
    }

    const unlockedConstellations = config.constellations.filter(c => c.unlocked);
    
    const moraBonus = unlockedConstellations.reduce((sum, c) => sum + (c.rewards.moraBonus || 0), 0);
    const primogenBonus = unlockedConstellations.reduce((sum, c) => sum + (c.rewards.primogenBonus || 0), 0);
    const resinBonus = unlockedConstellations.reduce((sum, c) => sum + (c.rewards.resinBonus || 0), 0);
    const xpBonus = unlockedConstellations.reduce((sum, c) => sum + (c.rewards.xpBonus || 0), 0);

    return { moraBonus, primogenBonus, resinBonus, xpBonus };
  }

  /**
   * Monte de niveau une constellation
   */
  static async levelUpConstellation(guildId: string, constellationId: string): Promise<{ success: boolean; message: string; newLevel?: number }> {
    const config = await ServerConfig.findOne({ guildId });
    if (!config) {
      return { success: false, message: 'Configuration du serveur non trouvée' };
    }

    const constellation = config.constellations.find(c => c.constellationId === constellationId);
    if (!constellation) {
      return { success: false, message: 'Constellation non trouvée' };
    }

    if (!constellation.unlocked) {
      return { success: false, message: 'Cette constellation n\'est pas encore débloquée' };
    }

    if (constellation.level >= constellation.maxLevel) {
      return { success: false, message: 'Cette constellation est déjà au niveau maximum' };
    }

    const newLevel = constellation.level + 1;
    await ServerConfig.findOneAndUpdate(
      { guildId, 'constellations.constellationId': constellationId },
      {
        $set: {
          'constellations.$.level': newLevel,
          'constellations.$.rewards.moraBonus': (constellation.rewards.moraBonus || 0) * 1.2,
          'constellations.$.rewards.primogenBonus': (constellation.rewards.primogenBonus || 0) * 1.2,
          'constellations.$.rewards.resinBonus': (constellation.rewards.resinBonus || 0) * 1.2,
          'constellations.$.rewards.xpBonus': (constellation.rewards.xpBonus || 0) * 1.2,
          updatedAt: new Date()
        }
      }
    );

    return { success: true, message: `Constellation montée au niveau ${newLevel}!`, newLevel };
  }
}

export const serverConfigService = ServerConfigService;
