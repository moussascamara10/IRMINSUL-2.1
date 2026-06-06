import type { IUser } from '../database/models/index.js';
import { economyService } from './EconomyService.js';

export interface ARMilestone {
  ar: number;
  name: string;
  description: string;
  rewards: {
    mora: number;
    primogens: number;
    fates: number;
    exclusiveItems: string[];
    unlocks: string[];
  };
  requirements: {
    completedQuests?: string[];
    defeatedBosses?: string[];
    exploredAreas?: string[];
  };
}

export interface WorldLevelMilestone {
  worldLevel: number;
  name: string;
  description: string;
  requirements: {
    ar: number;
    completedTest?: string;
  };
  rewards: {
    mora: number;
    primogens: number;
    fates: number;
    exclusiveItems: string[];
  };
}

export interface UserMilestoneProgress {
  userId: string;
  claimedARMilestones: number[];
  claimedWorldLevelMilestones: number[];
  totalMilestonesClaimed: number;
}

export class MilestoneRewardService {
  private static readonly AR_MILESTONES: ARMilestone[] = [
    {
      ar: 1,
      name: 'Début de l\'aventure',
      description: 'Commencez votre voyage à Teyvat',
      rewards: {
        mora: 5000,
        primogens: 20,
        fates: 0,
        exclusiveItems: ['wind_glider'],
        unlocks: ['sprint', 'glide']
      },
      requirements: {}
    },
    {
      ar: 5,
      name: 'Explorateur novice',
      description: 'Débloquez les domaines d\'artefacts',
      rewards: {
        mora: 10000,
        primogens: 40,
        fates: 0,
        exclusiveItems: ['domain_access'],
        unlocks: ['artifact_domains']
      },
      requirements: {
        completedQuests: ['prologue_act3']
      }
    },
    {
      ar: 10,
      name: 'Aventurier confirmé',
      description: 'Débloquez les boss hebdomadaires',
      rewards: {
        mora: 20000,
        primogens: 80,
        fates: 1,
        exclusiveItems: ['weekly_boss_access'],
        unlocks: ['weekly_bosses']
      },
      requirements: {
        defeatedBosses: ['stormterror']
      }
    },
    {
      ar: 15,
      name: 'Voyager des régions',
      description: 'Débloquez les expéditions multi-régions',
      rewards: {
        mora: 30000,
        primogens: 100,
        fates: 1,
        exclusiveItems: ['multi_region_expeditions'],
        unlocks: ['expedition_expansion']
      },
      requirements: {
        exploredAreas: ['mondstadt', 'liyue']
      }
    },
    {
      ar: 20,
      name: 'Maître de la résine',
      description: 'Augmentez votre capacité de résine',
      rewards: {
        mora: 40000,
        primogens: 120,
        fates: 1,
        exclusiveItems: ['resin_capacity_160'],
        unlocks: ['resin_upgrade']
      },
      requirements: {}
    },
    {
      ar: 25,
      name: 'Chasseur de trésors',
      description: 'Débloquez les coffres légendaires',
      rewards: {
        mora: 50000,
        primogens: 150,
        fates: 1,
        exclusiveItems: ['legendary_chest_access'],
        unlocks: ['legendary_chests']
      },
      requirements: {
        completedQuests: ['chapter1_act3']
      }
    },
    {
      ar: 30,
      name: 'Expert en combat',
      description: 'Débloquez les défis de combat',
      rewards: {
        mora: 60000,
        primogens: 180,
        fates: 2,
        exclusiveItems: ['combat_challenges'],
        unlocks: ['combat_challenges']
      },
      requirements: {
        defeatedBosses: ['childe', 'la_signora']
      }
    },
    {
      ar: 35,
      name: 'Maître des éléments',
      description: 'Débloquez les réactions élémentaires avancées',
      rewards: {
        mora: 70000,
        primogens: 200,
        fates: 2,
        exclusiveItems: ['advanced_reactions'],
        unlocks: ['advanced_mechanics']
      },
      requirements: {}
    },
    {
      ar: 40,
      name: 'Héros de Teyvat',
      description: 'Débloquez les raids de guilde',
      rewards: {
        mora: 80000,
        primogens: 250,
        fates: 2,
        exclusiveItems: ['guild_raids'],
        unlocks: ['guild_raid_system']
      },
      requirements: {
        completedQuests: ['chapter2_act3']
      }
    },
    {
      ar: 45,
      name: 'Légende vivante',
      description: 'Débloquez les contenus endgame',
      rewards: {
        mora: 100000,
        primogens: 300,
        fates: 3,
        exclusiveItems: ['endgame_access'],
        unlocks: ['spiral_abyss', 'endgame_raid']
      },
      requirements: {
        defeatedBosses: ['azhdaha', 'scaramouche']
      }
    },
    {
      ar: 50,
      name: 'Maître absolu',
      description: 'Accès complet à tous les contenus',
      rewards: {
        mora: 150000,
        primogens: 400,
        fates: 4,
        exclusiveItems: ['full_access', 'crown_of_insight'],
        unlocks: ['all_content']
      },
      requirements: {
        completedQuests: ['chapter3_act3'],
        exploredAreas: ['mondstadt', 'liyue', 'inazuma', 'sumeru']
      }
    },
    {
      ar: 55,
      name: 'Ascension',
      description: 'Contenus de très haut niveau',
      rewards: {
        mora: 200000,
        primogens: 500,
        fates: 5,
        exclusiveItems: ['ascension_content'],
        unlocks: ['nightmare_raids']
      },
      requirements: {}
    },
    {
      ar: 60,
      name: 'Apogée',
      description: 'Sommet de la progression',
      rewards: {
        mora: 500000,
        primogens: 1000,
        fates: 10,
        exclusiveItems: ['apogee_badge', 'crown_of_insight_x3'],
        unlocks: ['ultimate_challenges']
      },
      requirements: {
        defeatedBosses: ['all_bosses']
      }
    }
  ];

  private static readonly WORLD_LEVEL_MILESTONES: WorldLevelMilestone[] = [
    {
      worldLevel: 1,
      name: 'Niveau Monde 1',
      description: 'Première ascension',
      requirements: {
        ar: 20,
        completedTest: 'ascension_quest_1'
      },
      rewards: {
        mora: 20000,
        primogens: 100,
        fates: 1,
        exclusiveItems: ['wl1_badge']
      }
    },
    {
      worldLevel: 2,
      name: 'Niveau Monde 2',
      description: 'Boss plus puissants',
      requirements: {
        ar: 25,
        completedTest: 'ascension_quest_2'
      },
      rewards: {
        mora: 30000,
        primogens: 150,
        fates: 1,
        exclusiveItems: ['wl2_badge']
      }
    },
    {
      worldLevel: 3,
      name: 'Niveau Monde 3',
      description: 'Contenus endgame débloqués',
      requirements: {
        ar: 30,
        completedTest: 'ascension_quest_3'
      },
      rewards: {
        mora: 40000,
        primogens: 200,
        fates: 2,
        exclusiveItems: ['wl3_badge']
      }
    },
    {
      worldLevel: 4,
      name: 'Niveau Monde 4',
      description: 'Raids de guilde disponibles',
      requirements: {
        ar: 35,
        completedTest: 'ascension_quest_4'
      },
      rewards: {
        mora: 50000,
        primogens: 250,
        fates: 2,
        exclusiveItems: ['wl4_badge']
      }
    },
    {
      worldLevel: 5,
      name: 'Niveau Monde 5',
      description: 'Spiral Abyss débloqué',
      requirements: {
        ar: 40,
        completedTest: 'ascension_quest_5'
      },
      rewards: {
        mora: 60000,
        primogens: 300,
        fates: 3,
        exclusiveItems: ['wl5_badge']
      }
    },
    {
      worldLevel: 6,
      name: 'Niveau Monde 6',
      description: 'Contenus extrêmes',
      requirements: {
        ar: 45,
        completedTest: 'ascension_quest_6'
      },
      rewards: {
        mora: 80000,
        primogens: 400,
        fates: 3,
        exclusiveItems: ['wl6_badge']
      }
    },
    {
      worldLevel: 7,
      name: 'Niveau Monde 7',
      description: 'Défis ultimes',
      requirements: {
        ar: 50,
        completedTest: 'ascension_quest_7'
      },
      rewards: {
        mora: 100000,
        primogens: 500,
        fates: 4,
        exclusiveItems: ['wl7_badge']
      }
    },
    {
      worldLevel: 8,
      name: 'Niveau Monde 8',
      description: 'Sommet de la difficulté',
      requirements: {
        ar: 55,
        completedTest: 'ascension_quest_8'
      },
      rewards: {
        mora: 150000,
        primogens: 600,
        fates: 5,
        exclusiveItems: ['wl8_badge']
      }
    }
  ];

  private static userProgress: Map<string, UserMilestoneProgress> = new Map();

  /**
   * Récupère tous les milestones AR
   */
  static getARMilestones(): ARMilestone[] {
    return this.AR_MILESTONES;
  }

  /**
   * Récupère un milestone AR spécifique
   */
  static getARMilestone(ar: number): ARMilestone | undefined {
    return this.AR_MILESTONES.find(milestone => milestone.ar === ar);
  }

  /**
   * Récupère tous les milestones World Level
   */
  static getWorldLevelMilestones(): WorldLevelMilestone[] {
    return this.WORLD_LEVEL_MILESTONES;
  }

  /**
   * Récupère un milestone World Level spécifique
   */
  static getWorldLevelMilestone(worldLevel: number): WorldLevelMilestone | undefined {
    return this.WORLD_LEVEL_MILESTONES.find(milestone => milestone.worldLevel === worldLevel);
  }

  /**
   * Vérifie si un milestone AR est disponible
   */
  static isARMilestoneAvailable(user: IUser, ar: number): boolean {
    const milestone = this.getARMilestone(ar);
    if (!milestone) return false;

    if (user.adventureRank < ar) return false;

    // Vérifier les requirements
    if (milestone.requirements.completedQuests) {
      // TODO: Vérifier si les quêtes sont complétées
    }

    if (milestone.requirements.defeatedBosses) {
      // TODO: Vérifier si les boss sont vaincus
    }

    if (milestone.requirements.exploredAreas) {
      // TODO: Vérifier si les zones sont explorées
    }

    return true;
  }

  /**
   * Vérifie si un milestone World Level est disponible
   */
  static isWorldLevelMilestoneAvailable(user: IUser, worldLevel: number): boolean {
    const milestone = this.getWorldLevelMilestone(worldLevel);
    if (!milestone) return false;

    if (user.adventureRank < milestone.requirements.ar) return false;

    if (milestone.requirements.completedTest) {
      // TODO: Vérifier si le test est complété
    }

    return true;
  }

  /**
   * Réclame un milestone AR
   */
  static claimARMilestone(user: IUser, ar: number): {
    success: boolean;
    rewards?: ARMilestone['rewards'];
    error?: string;
  } {
    const milestone = this.getARMilestone(ar);
    if (!milestone) {
      return { success: false, error: 'Milestone introuvable' };
    }

    if (!this.isARMilestoneAvailable(user, ar)) {
      return { success: false, error: 'Conditions non remplies' };
    }

    const progress = this.getUserProgress(user.discordId);
    if (progress.claimedARMilestones.includes(ar)) {
      return { success: false, error: 'Milestone déjà réclamé' };
    }

    // Accorder les récompenses
    economyService.addResource(user, 'mora', milestone.rewards.mora, `Milestone AR ${ar}`);
    economyService.addResource(user, 'primogens', milestone.rewards.primogens, `Milestone AR ${ar}`);
    
    if (milestone.rewards.fates > 0) {
      economyService.addResource(user, 'fatesIntertwined', milestone.rewards.fates, `Milestone AR ${ar}`);
    }

    // Marquer comme réclamé
    progress.claimedARMilestones.push(ar);
    progress.totalMilestonesClaimed++;

    return { success: true, rewards: milestone.rewards };
  }

  /**
   * Réclame un milestone World Level
   */
  static claimWorldLevelMilestone(user: IUser, worldLevel: number): {
    success: boolean;
    rewards?: WorldLevelMilestone['rewards'];
    error?: string;
  } {
    const milestone = this.getWorldLevelMilestone(worldLevel);
    if (!milestone) {
      return { success: false, error: 'Milestone introuvable' };
    }

    if (!this.isWorldLevelMilestoneAvailable(user, worldLevel)) {
      return { success: false, error: 'Conditions non remplies' };
    }

    const progress = this.getUserProgress(user.discordId);
    if (progress.claimedWorldLevelMilestones.includes(worldLevel)) {
      return { success: false, error: 'Milestone déjà réclamé' };
    }

    // Accorder les récompenses
    economyService.addResource(user, 'mora', milestone.rewards.mora, `Milestone WL ${worldLevel}`);
    economyService.addResource(user, 'primogens', milestone.rewards.primogens, `Milestone WL ${worldLevel}`);
    
    if (milestone.rewards.fates > 0) {
      economyService.addResource(user, 'fatesIntertwined', milestone.rewards.fates, `Milestone WL ${worldLevel}`);
    }

    // Mettre à jour le World Level de l'utilisateur
    user.worldLevel = worldLevel;

    // Marquer comme réclamé
    progress.claimedWorldLevelMilestones.push(worldLevel);
    progress.totalMilestonesClaimed++;

    return { success: true, rewards: milestone.rewards };
  }

  /**
   * Récupère la progression d'un utilisateur
   */
  static getUserProgress(userId: string): UserMilestoneProgress {
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, {
        userId,
        claimedARMilestones: [],
        claimedWorldLevelMilestones: [],
        totalMilestonesClaimed: 0
      });
    }
    return this.userProgress.get(userId)!;
  }

  /**
   * Récupère les milestones AR disponibles pour un utilisateur
   */
  static getAvailableARMilestones(user: IUser): ARMilestone[] {
    return this.AR_MILESTONES.filter(milestone => 
      this.isARMilestoneAvailable(user, milestone.ar) &&
      !this.getUserProgress(user.discordId).claimedARMilestones.includes(milestone.ar)
    );
  }

  /**
   * Récupère les milestones World Level disponibles pour un utilisateur
   */
  static getAvailableWorldLevelMilestones(user: IUser): WorldLevelMilestone[] {
    return this.WORLD_LEVEL_MILESTONES.filter(milestone => 
      this.isWorldLevelMilestoneAvailable(user, milestone.worldLevel) &&
      !this.getUserProgress(user.discordId).claimedWorldLevelMilestones.includes(milestone.worldLevel)
    );
  }

  /**
   * Récupère le prochain milestone AR disponible
   */
  static getNextARMilestone(user: IUser): ARMilestone | null {
    const available = this.getAvailableARMilestones(user);
    return available.length > 0 ? available[0] : null;
  }

  /**
   * Récupère le prochain milestone World Level disponible
   */
  static getNextWorldLevelMilestone(user: IUser): WorldLevelMilestone | null {
    const available = this.getAvailableWorldLevelMilestones(user);
    return available.length > 0 ? available[0] : null;
  }

  /**
   * Calcule le pourcentage de progression vers le prochain milestone AR
   */
  static getARMilestoneProgress(user: IUser): {
    currentAR: number;
    nextMilestoneAR: number;
    percentage: number;
  } {
    const nextMilestone = this.getNextARMilestone(user);
    
    if (!nextMilestone) {
      return {
        currentAR: user.adventureRank,
        nextMilestoneAR: user.adventureRank,
        percentage: 100
      };
    }

    const previousMilestoneAR = this.AR_MILESTONES
      .filter(m => m.ar < nextMilestone.ar)
      .sort((a, b) => b.ar - a.ar)[0]?.ar || 0;

    const range = nextMilestone.ar - previousMilestoneAR;
    const progress = user.adventureRank - previousMilestoneAR;
    const percentage = Math.min(100, (progress / range) * 100);

    return {
      currentAR: user.adventureRank,
      nextMilestoneAR: nextMilestone.ar,
      percentage: Math.floor(percentage)
    };
  }

  /**
   * Récupère les récompenses totales d'un milestone AR
   */
  static getTotalARMilestoneRewards(ar: number): {
    totalMora: number;
    totalPrimogens: number;
    totalFates: number;
    exclusiveItems: string[];
  } {
    const milestones = this.AR_MILESTONES.filter(m => m.ar <= ar);
    
    return {
      totalMora: milestones.reduce((sum, m) => sum + m.rewards.mora, 0),
      totalPrimogens: milestones.reduce((sum, m) => sum + m.rewards.primogens, 0),
      totalFates: milestones.reduce((sum, m) => sum + m.rewards.fates, 0),
      exclusiveItems: milestones.flatMap(m => m.rewards.exclusiveItems)
    };
  }

  /**
   * Récupère les récompenses totales d'un milestone World Level
   */
  static getTotalWorldLevelMilestoneRewards(worldLevel: number): {
    totalMora: number;
    totalPrimogens: number;
    totalFates: number;
    exclusiveItems: string[];
  } {
    const milestones = this.WORLD_LEVEL_MILESTONES.filter(m => m.worldLevel <= worldLevel);
    
    return {
      totalMora: milestones.reduce((sum, m) => sum + m.rewards.mora, 0),
      totalPrimogens: milestones.reduce((sum, m) => sum + m.rewards.primogens, 0),
      totalFates: milestones.reduce((sum, m) => sum + m.rewards.fates, 0),
      exclusiveItems: milestones.flatMap(m => m.rewards.exclusiveItems)
    };
  }

  /**
   * Vérifie si l'utilisateur peut upgrader son World Level
   */
  static canUpgradeWorldLevel(user: IUser): boolean {
    const nextWL = user.worldLevel + 1;
    return this.isWorldLevelMilestoneAvailable(user, nextWL);
  }

  /**
   * Upgrade le World Level de l'utilisateur
   */
  static upgradeWorldLevel(user: IUser): {
    success: boolean;
    newWorldLevel?: number;
    rewards?: WorldLevelMilestone['rewards'];
    error?: string;
  } {
    const nextWL = user.worldLevel + 1;
    const result = this.claimWorldLevelMilestone(user, nextWL);

    if (result.success) {
      return {
        success: true,
        newWorldLevel: nextWL,
        rewards: result.rewards
      };
    }

    return {
      success: false,
      error: result.error
    };
  }
}

export const milestoneRewardService = MilestoneRewardService;
