import type { IUser } from '../database/models/index.js';

export interface ResourceLimits {
  mora: number;
  primogens: number;
  fatesIntertwined: number;
  fatesAcquaint: number;
  stardust: number;
  starglitter: number;
  resin: number;
  condensedResin: number;
}

export interface ResourceTransaction {
  type: 'mora' | 'primogens' | 'fatesIntertwined' | 'fatesAcquaint' | 'stardust' | 'starglitter' | 'resin' | 'condensedResin';
  amount: number;
  reason: string;
  source?: string;
}

export interface EconomyResult {
  success: boolean;
  newBalance: number;
  error?: string;
}

export class EconomyService {
  private static readonly RESOURCE_LIMITS: ResourceLimits = {
    mora: 999999999,
    primogens: 999999,
    fatesIntertwined: 999,
    fatesAcquaint: 999,
    stardust: 999999,
    starglitter: 99999,
    resin: 200,
    condensedResin: 5
  };

  private static readonly GACHA_COST = {
    primogens: 160,
    fatesIntertwined: 1,
    fatesAcquaint: 1
  };

  private static readonly RESIN_COSTS = {
    boss: 20,
    domain: 20,
    weeklyBoss: 60,
    expedition: 0
  };

  /**
   * Vérifie si une transaction est valide
   */
  private static validateTransaction(
    type: keyof ResourceLimits,
    amount: number,
    currentBalance: number
  ): { valid: boolean; error?: string } {
    const limit = this.RESOURCE_LIMITS[type];
    
    if (amount < 0) {
      return { valid: false, error: 'Le montant ne peut pas être négatif' };
    }
    
    if (currentBalance + amount > limit) {
      return { valid: false, error: `Limite atteinte pour ${type} (${limit})` };
    }
    
    if (currentBalance - amount < 0) {
      return { valid: false, error: `Solde insuffisant pour ${type}` };
    }
    
    return { valid: true };
  }

  /**
   * Ajoute une ressource
   */
  static addResource(
    user: IUser,
    type: keyof ResourceLimits,
    amount: number,
    reason: string,
    source?: string
  ): EconomyResult {
    const validation = this.validateTransaction(type, amount, (user as any)[type]);
    if (!validation.valid) {
      return { success: false, newBalance: (user as any)[type], error: validation.error };
    }

    (user as any)[type] += amount;
    return { success: true, newBalance: (user as any)[type] };
  }

  /**
   * Retire une ressource
   */
  static removeResource(
    user: IUser,
    type: keyof ResourceLimits,
    amount: number,
    reason: string
  ): EconomyResult {
    const validation = this.validateTransaction(type, -amount, (user as any)[type]);
    if (!validation.valid) {
      return { success: false, newBalance: (user as any)[type], error: validation.error };
    }

    (user as any)[type] -= amount;
    return { success: true, newBalance: (user as any)[type] };
  }

  /**
   * Vérifie si l'utilisateur a assez de ressources pour un gacha
   */
  static canAffordGacha(user: IUser, pulls: number, currency: 'primogens' | 'fatesIntertwined' | 'fatesAcquaint'): boolean {
    const cost = pulls * this.GACHA_COST[currency];
    return (user as any)[currency] >= cost;
  }

  /**
   * Déduit le coût d'un gacha
   */
  static deductGachaCost(
    user: IUser,
    pulls: number,
    currency: 'primogens' | 'fatesIntertwined' | 'fatesAcquaint'
  ): EconomyResult {
    const cost = pulls * this.GACHA_COST[currency];
    return this.removeResource(user, currency, cost, 'Gacha pull');
  }

  /**
   * Vérifie si l'utilisateur a assez de résine
   */
  static canAffordResin(user: IUser, cost: keyof typeof EconomyService.RESIN_COSTS): boolean {
    const currentResin = this.getCurrentResin(user);
    return currentResin >= this.RESIN_COSTS[cost];
  }

  /**
   * Déduit le coût en résine
   */
  static deductResinCost(
    user: IUser,
    cost: keyof typeof EconomyService.RESIN_COSTS
  ): EconomyResult {
    const currentResin = this.getCurrentResin(user);
    const resinCost = this.RESIN_COSTS[cost];
    
    if (currentResin < resinCost) {
      return { success: false, newBalance: currentResin, error: 'Résine insuffisante' };
    }

    user.resin = currentResin - resinCost;
    user.lastResinUpdate = new Date();
    return { success: true, newBalance: user.resin };
  }

  /**
   * Calcule la résine actuelle avec regen
   */
  static getCurrentResin(user: IUser): number {
    const now = new Date();
    const diffMs = now.getTime() - user.lastResinUpdate.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const regenAmount = Math.floor(diffMinutes / 8); // 1 résine toutes les 8 minutes
    return Math.min(user.resin + regenAmount, this.RESOURCE_LIMITS.resin);
  }

  /**
   * Convertit Primogens en Fates
   */
  static convertPrimogensToFates(
    user: IUser,
    amount: number,
    fateType: 'fatesIntertwined' | 'fatesAcquaint'
  ): EconomyResult {
    const primogenCost = amount * 160;
    
    const primogenResult = this.removeResource(user, 'primogens', primogenCost, 'Conversion Primogens → Fates');
    if (!primogenResult.success) {
      return { success: false, newBalance: (user as any)[fateType], error: primogenResult.error };
    }

    const fateResult = this.addResource(user, fateType, amount, 'Conversion Primogens → Fates');
    if (!fateResult.success) {
      // Rembourser les primogens si l'ajout échoue
      this.addResource(user, 'primogens', primogenCost, 'Remboursement conversion échouée');
      return { success: false, newBalance: (user as any)[fateType], error: fateResult.error };
    }

    return { success: true, newBalance: (user as any)[fateType] };
  }

  /**
   * Coût d'amélioration personnage (XP)
   */
  static getCharacterUpgradeCost(level: number, toLevel: number): { mora: number; xp: number } {
    const baseCost = 1000;
    const levelMultiplier = Math.pow(level, 1.5);
    return {
      mora: Math.floor(baseCost * levelMultiplier * (toLevel - level)),
      xp: (toLevel - level) * 1000
    };
  }

  /**
   * Coût d'amélioration arme (XP)
   */
  static getWeaponUpgradeCost(level: number, toLevel: number): { mora: number; xp: number } {
    const baseCost = 500;
    const levelMultiplier = Math.pow(level, 1.3);
    return {
      mora: Math.floor(baseCost * levelMultiplier * (toLevel - level)),
      xp: (toLevel - level) * 500
    };
  }

  /**
   * Coût d'amélioration artefact (XP)
   */
  static getArtifactUpgradeCost(level: number, toLevel: number): { mora: number; xp: number } {
    const baseCost = 200;
    const levelMultiplier = Math.pow(level, 1.2);
    return {
      mora: Math.floor(baseCost * levelMultiplier * (toLevel - level)),
      xp: (toLevel - level) * 100
    };
  }

  /**
   * Vérifie si l'utilisateur peut améliorer un personnage
   */
  static canUpgradeCharacter(user: IUser, currentLevel: number, toLevel: number): boolean {
    const cost = this.getCharacterUpgradeCost(currentLevel, toLevel);
    return user.mora >= cost.mora;
  }

  /**
   * Déduit le coût d'amélioration personnage
   */
  static deductCharacterUpgradeCost(user: IUser, currentLevel: number, toLevel: number): EconomyResult {
    const cost = this.getCharacterUpgradeCost(currentLevel, toLevel);
    return this.removeResource(user, 'mora', cost.mora, `Amélioration personnage Nv.${currentLevel} → ${toLevel}`);
  }

  /**
   * Vérifie si l'utilisateur peut améliorer une arme
   */
  static canUpgradeWeapon(user: IUser, currentLevel: number, toLevel: number): boolean {
    const cost = this.getWeaponUpgradeCost(currentLevel, toLevel);
    return user.mora >= cost.mora;
  }

  /**
   * Déduit le coût d'amélioration arme
   */
  static deductWeaponUpgradeCost(user: IUser, currentLevel: number, toLevel: number): EconomyResult {
    const cost = this.getWeaponUpgradeCost(currentLevel, toLevel);
    return this.removeResource(user, 'mora', cost.mora, `Amélioration arme Nv.${currentLevel} → ${toLevel}`);
  }

  /**
   * Vérifie si l'utilisateur peut améliorer un artefact
   */
  static canUpgradeArtifact(user: IUser, currentLevel: number, toLevel: number): boolean {
    const cost = this.getArtifactUpgradeCost(currentLevel, toLevel);
    return user.mora >= cost.mora;
  }

  /**
   * Déduit le coût d'amélioration artefact
   */
  static deductArtifactUpgradeCost(user: IUser, currentLevel: number, toLevel: number): EconomyResult {
    const cost = this.getArtifactUpgradeCost(currentLevel, toLevel);
    return this.removeResource(user, 'mora', cost.mora, `Amélioration artefact Nv.${currentLevel} → ${toLevel}`);
  }

  /**
   * Récompenses AR (pour éviter inflation)
   */
  static getARReward(ar: number): { mora: number; primogens: number; fates: number } {
    const baseReward = {
      mora: 10000 * ar,
      primogens: 60,
      fates: 0
    };

    // Bonus tous les 5 AR
    if (ar % 5 === 0) {
      baseReward.primogens += 160; // 1 Fate
      baseReward.fates += 1;
    }

    // Bonus tous les 10 AR
    if (ar % 10 === 0) {
      baseReward.primogens += 160; // 1 Fate supplémentaire
      baseReward.fates += 1;
    }

    return baseReward;
  }

  /**
   * Accorde les récompenses AR
   */
  static grantARReward(user: IUser, ar: number): { mora: number; primogens: number; fates: number } {
    const reward = this.getARReward(ar);
    
    this.addResource(user, 'mora', reward.mora, `Récompense AR ${ar}`);
    this.addResource(user, 'primogens', reward.primogens, `Récompense AR ${ar}`);
    
    if (reward.fates > 0) {
      this.addResource(user, 'fatesIntertwined', reward.fates, `Récompense AR ${ar}`);
    }

    return reward;
  }

  /**
   * Récompenses World Level
   */
  static getWorldLevelReward(wl: number): { mora: number; primogens: number } {
    return {
      mora: 50000 * wl,
      primogens: 300 * wl
    };
  }

  /**
   * Accorde les récompenses World Level
   */
  static grantWorldLevelReward(user: IUser, wl: number): { mora: number; primogens: number } {
    const reward = this.getWorldLevelReward(wl);
    
    this.addResource(user, 'mora', reward.mora, `Récompense WL ${wl}`);
    this.addResource(user, 'primogens', reward.primogens, `Récompense WL ${wl}`);

    return reward;
  }

  /**
   * Récompenses combat boss
   */
  static getBossReward(worldLevel: number): { mora: number; xp: number; artifacts: number } {
    const wlMultiplier = 1 + (worldLevel * 0.1);
    return {
      mora: Math.floor(2000 * wlMultiplier),
      xp: Math.floor(100 * wlMultiplier),
      artifacts: Math.floor(Math.random() * 3) // 0-2 artefacts
    };
  }

  /**
   * Accorde les récompenses boss
   */
  static grantBossReward(user: IUser, worldLevel: number): { mora: number; xp: number; artifacts: number } {
    const reward = this.getBossReward(worldLevel);
    
    this.addResource(user, 'mora', reward.mora, 'Récompense boss');
    
    return reward;
  }

  /**
   * Récompenses domain
   */
  static getDomainReward(worldLevel: number): { mora: number; xp: number; artifacts: number } {
    const wlMultiplier = 1 + (worldLevel * 0.1);
    return {
      mora: Math.floor(1500 * wlMultiplier),
      xp: Math.floor(80 * wlMultiplier),
      artifacts: 1 // 1 artefact garanti
    };
  }

  /**
   * Accorde les récompenses domain
   */
  static grantDomainReward(user: IUser, worldLevel: number): { mora: number; xp: number; artifacts: number } {
    const reward = this.getDomainReward(worldLevel);
    
    this.addResource(user, 'mora', reward.mora, 'Récompense domain');
    
    return reward;
  }

  /**
   * Récompenses expedition
   */
  static getExpeditionReward(duration: number): { mora: number; xp: number; materials: number } {
    const durationMultiplier = duration / 4; // Basé sur 4h
    return {
      mora: Math.floor(500 * durationMultiplier),
      xp: Math.floor(50 * durationMultiplier),
      materials: Math.floor(Math.random() * 3)
    };
  }

  /**
   * Accorde les récompenses expedition
   */
  static grantExpeditionReward(user: IUser, duration: number): { mora: number; xp: number; materials: number } {
    const reward = this.getExpeditionReward(duration);
    
    this.addResource(user, 'mora', reward.mora, 'Récompense expedition');
    
    return reward;
  }

  /**
   * Vérifie l'état économique d'un utilisateur
   */
  static getEconomyStatus(user: IUser): {
    mora: number;
    primogens: number;
    fatesIntertwined: number;
    fatesAcquaint: number;
    stardust: number;
    starglitter: number;
    resin: number;
    condensedResin: number;
    resinRegenProgress: number;
    resinTimeToFull: number;
  } {
    const currentResin = this.getCurrentResin(user);
    const resinNeeded = this.RESOURCE_LIMITS.resin - currentResin;
    const resinTimeToFull = resinNeeded * 8; // minutes

    return {
      mora: user.mora,
      primogens: user.primogens,
      fatesIntertwined: user.fatesIntertwined,
      fatesAcquaint: user.fatesAcquaint,
      stardust: user.stardust,
      starglitter: user.starglitter,
      resin: currentResin,
      condensedResin: user.condensedResin,
      resinRegenProgress: Math.floor((currentResin / this.RESOURCE_LIMITS.resin) * 100),
      resinTimeToFull
    };
  }
}

export const economyService = EconomyService;
