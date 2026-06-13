import type { IUser } from '../database/models/index.js';
import { CombatEngine } from './CombatEngine.js';
import { economyService } from './EconomyService.js';

export interface RaidConfig {
  id: string;
  name: string;
  description: string;
  minWorldLevel: number;
  minAR: number;
  difficulty: 'normal' | 'hard' | 'extreme' | 'nightmare';
  maxParticipants: number;
  timeLimit: number; // en minutes
  entryCost: number; // résine
  rewards: {
    mora: number;
    primogens: number;
    artifacts: number;
    materials: string[];
  };
  mechanics: string[];
}

export interface ChallengeConfig {
  id: string;
  name: string;
  description: string;
  type: 'time_trial' | 'survival' | 'damage' | 'no_damage' | 'elemental';
  requirements: {
    minAR: number;
    minWorldLevel: number;
    requiredElements?: string[];
    forbiddenElements?: string[];
  };
  objectives: {
    primary: string;
    secondary?: string;
  };
  rewards: {
    mora: number;
    primogens: number;
    starglitter: number;
  };
  weeklyLimit: number;
}

export interface RaidInstance {
  raidId: string;
  participants: string[];
  startTime: Date;
  endTime?: Date;
  status: 'preparing' | 'in_progress' | 'completed' | 'failed';
  difficulty: string;
  currentHP: number;
  maxHP: number;
  damageDealt: { [userId: string]: number };
}

export interface ScalingConfig {
  baseHP: number;
  baseATK: number;
  baseDEF: number;
  hpScaling: number; // multiplicateur par participant
  atkScaling: number; // multiplicateur par World Level
  defScaling: number; // multiplicateur par AR
  phaseThresholds: number[]; // HP % pour changer de phase
  phaseMultipliers: number[]; // multiplicateurs de stats par phase
}

export class EndgameService {
  private static readonly RAIDS: RaidConfig[] = [
    {
      id: 'stormterror',
      name: 'Dvalin le Stormterror',
      description: 'Affrontez le dragon des tempêtes dans son repaire',
      minWorldLevel: 2,
      minAR: 25,
      difficulty: 'normal',
      maxParticipants: 4,
      timeLimit: 15,
      entryCost: 40,
      rewards: {
        mora: 10000,
        primogens: 60,
        artifacts: 2,
        materials: ['vajrada_amethyst_sliver', 'hurricane_seed']
      },
      mechanics: ['wind_currents', 'updrafts', 'shield_break']
    },
    {
      id: 'childe',
      name: 'Childe le Tsaritsa',
      description: 'Duel contre le 11ème Fatui Harbinger',
      minWorldLevel: 4,
      minAR: 35,
      difficulty: 'hard',
      maxParticipants: 4,
      timeLimit: 12,
      entryCost: 40,
      rewards: {
        mora: 15000,
        primogens: 80,
        artifacts: 3,
        materials: ['shard_of_a_foul_legacy', 'everflame_seed']
      },
      mechanics: ['hydro_phase', 'melee_phase', 'ranged_phase', 'foul_legacy']
    },
    {
      id: 'azhdaha',
      name: 'Azhdaha le Seigneur des Vishes',
      description: 'Affrontez le dragon géant sous la terre',
      minWorldLevel: 6,
      minAR: 45,
      difficulty: 'extreme',
      maxParticipants: 4,
      timeLimit: 10,
      entryCost: 60,
      rewards: {
        mora: 20000,
        primogens: 100,
        artifacts: 4,
        materials: ['dragon_lords_crown', 'golden_jade_branch']
      },
      mechanics: ['elemental_infusion', 'phase_change', 'underground', 'aoe_burst']
    },
    {
      id: 'signora',
      name: 'La Signora',
      description: 'Combat final contre la 8ème Fatui Harbinger',
      minWorldLevel: 8,
      minAR: 55,
      difficulty: 'nightmare',
      maxParticipants: 4,
      timeLimit: 8,
      entryCost: 60,
      rewards: {
        mora: 30000,
        primogens: 120,
        artifacts: 5,
        materials: ['crystalline_bloom', 'hellfire_butterfly']
      },
      mechanics: ['cryo_pyro_switch', 'phase_3', 'doomsday', 'sheer_cold']
    }
  ];

  private static readonly CHALLENGES: ChallengeConfig[] = [
    {
      id: 'spirits_abyss_time_trial',
      name: 'Spiral Abyss - Time Trial',
      description: 'Complétez les étages le plus rapidement possible',
      type: 'time_trial',
      requirements: {
        minAR: 20,
        minWorldLevel: 1
      },
      objectives: {
        primary: 'Compléter 12 étages en moins de 5 minutes',
        secondary: 'Obtenir 36 étoiles'
      },
      rewards: {
        mora: 5000,
        primogens: 50,
        starglitter: 15
      },
      weeklyLimit: 3
    },
    {
      id: 'no_damage_run',
      name: 'No Damage Challenge',
      description: 'Terminez un boss sans subir de dégâts',
      type: 'no_damage',
      requirements: {
        minAR: 30,
        minWorldLevel: 3
      },
      objectives: {
        primary: 'Vaincre un boss sans perdre de HP'
      },
      rewards: {
        mora: 8000,
        primogens: 80,
        starglitter: 25
      },
      weeklyLimit: 5
    },
    {
      id: 'elemental_mastery',
      name: 'Elemental Mastery Challenge',
      description: 'Utilisez uniquement un élément spécifique',
      type: 'elemental',
      requirements: {
        minAR: 25,
        minWorldLevel: 2,
        requiredElements: ['pyro']
      },
      objectives: {
        primary: 'Vaincre avec uniquement des personnages Pyro',
        secondary: 'Activer 10 réactions élémentaires'
      },
      rewards: {
        mora: 6000,
        primogens: 60,
        starglitter: 20
      },
      weeklyLimit: 7
    },
    {
      id: 'survival_mode',
      name: 'Survival Mode',
      description: 'Survivez le plus longtemps possible',
      type: 'survival',
      requirements: {
        minAR: 40,
        minWorldLevel: 5
      },
      objectives: {
        primary: 'Survivre 10 vagues d\'ennemis',
        secondary: 'Perdre moins de 20% HP total'
      },
      rewards: {
        mora: 10000,
        primogens: 100,
        starglitter: 30
      },
      weeklyLimit: 3
    }
  ];

  private static readonly SCALING_CONFIGS: { [raidId: string]: ScalingConfig } = {
    stormterror: {
      baseHP: 500000,
      baseATK: 3000,
      baseDEF: 800,
      hpScaling: 1.2,
      atkScaling: 1.1,
      defScaling: 1.05,
      phaseThresholds: [70, 40, 10],
      phaseMultipliers: [1.0, 1.2, 1.4, 1.6]
    },
    childe: {
      baseHP: 700000,
      baseATK: 4000,
      baseDEF: 1000,
      hpScaling: 1.25,
      atkScaling: 1.15,
      defScaling: 1.08,
      phaseThresholds: [66, 33, 0],
      phaseMultipliers: [1.0, 1.3, 1.5, 1.8]
    },
    azhdaha: {
      baseHP: 1000000,
      baseATK: 5000,
      baseDEF: 1200,
      hpScaling: 1.3,
      atkScaling: 1.2,
      defScaling: 1.1,
      phaseThresholds: [75, 50, 25, 0],
      phaseMultipliers: [1.0, 1.25, 1.5, 1.75, 2.0]
    },
    signora: {
      baseHP: 1500000,
      baseATK: 6000,
      baseDEF: 1500,
      hpScaling: 1.35,
      atkScaling: 1.25,
      defScaling: 1.12,
      phaseThresholds: [80, 60, 40, 20, 0],
      phaseMultipliers: [1.0, 1.2, 1.4, 1.6, 1.8, 2.2]
    }
  };

  /**
   * Récupère tous les raids disponibles
   */
  static getAvailableRaids(user: IUser): RaidConfig[] {
    return this.RAIDS.filter(raid => 
      user.worldLevel >= raid.minWorldLevel && 
      user.adventureRank >= raid.minAR
    );
  }

  /**
   * Récupère un raid spécifique
   */
  static getRaid(raidId: string): RaidConfig | undefined {
    return this.RAIDS.find(raid => raid.id === raidId);
  }

  /**
   * Vérifie si l'utilisateur peut accéder à un raid
   */
  static canAccessRaid(user: IUser, raidId: string): boolean {
    const raid = this.getRaid(raidId);
    if (!raid) return false;
    
    return user.worldLevel >= raid.minWorldLevel && 
           user.adventureRank >= raid.minAR &&
           economyService.canAffordResin(user, 'weeklyBoss');
  }

  /**
   * Calcule les stats d'un raid avec scaling
   */
  static calculateRaidStats(raidId: string, participants: IUser[], difficulty: string): {
    hp: number;
    atk: number;
    def: number;
    phases: number;
  } {
    const config = this.SCALING_CONFIGS[raidId];
    if (!config) {
      return { hp: 0, atk: 0, def: 0, phases: 1 };
    }

    const avgWorldLevel = participants.reduce((sum, p) => sum + p.worldLevel, 0) / participants.length;
    const avgAR = participants.reduce((sum, p) => sum + p.adventureRank, 0) / participants.length;

    const participantCount = participants.length;
    const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);

    const hp = Math.floor(
      config.baseHP * 
      Math.pow(config.hpScaling, participantCount) * 
      Math.pow(config.atkScaling, avgWorldLevel - 1) *
      difficultyMultiplier
    );

    const atk = Math.floor(
      config.baseATK * 
      Math.pow(config.atkScaling, avgWorldLevel - 1) * 
      Math.pow(config.defScaling, avgAR / 10) *
      difficultyMultiplier
    );

    const def = Math.floor(
      config.baseDEF * 
      Math.pow(config.defScaling, avgAR / 10) *
      difficultyMultiplier
    );

    return {
      hp,
      atk,
      def,
      phases: config.phaseThresholds.length
    };
  }

  /**
   * Récupère le multiplicateur de difficulté
   */
  private static getDifficultyMultiplier(difficulty: string): number {
    const multipliers: { [key: string]: number } = {
      normal: 1.0,
      hard: 1.3,
      extreme: 1.6,
      nightmare: 2.0
    };
    return multipliers[difficulty] || 1.0;
  }

  /**
   * Crée une instance de raid
   */
  static createRaidInstance(raidId: string, participants: string[], difficulty: string): RaidInstance {
    const raid = this.getRaid(raidId);
    if (!raid) {
      throw new Error('Raid introuvable');
    }

    const stats = this.calculateRaidStats(raidId, participants.map(() => ({ worldLevel: 5, adventureRank: 30 } as any)), difficulty);

    return {
      raidId,
      participants,
      startTime: new Date(),
      status: 'preparing',
      difficulty,
      currentHP: stats.hp,
      maxHP: stats.hp,
      damageDealt: {}
    };
  }

  /**
   * Récupère tous les challenges disponibles
   */
  static getAvailableChallenges(user: IUser): ChallengeConfig[] {
    return this.CHALLENGES.filter(challenge => 
      user.adventureRank >= challenge.requirements.minAR && 
      user.worldLevel >= challenge.requirements.minWorldLevel
    );
  }

  /**
   * Récupère un challenge spécifique
   */
  static getChallenge(challengeId: string): ChallengeConfig | undefined {
    return this.CHALLENGES.find(challenge => challenge.id === challengeId);
  }

  /**
   * Vérifie si l'utilisateur peut accéder à un challenge
   */
  static canAccessChallenge(user: IUser, challengeId: string): boolean {
    const challenge = this.getChallenge(challengeId);
    if (!challenge) return false;
    
    return user.adventureRank >= challenge.requirements.minAR && 
           user.worldLevel >= challenge.requirements.minWorldLevel;
  }

  /**
   * Accorde les récompenses de raid
   */
  static grantRaidRewards(user: IUser, raidId: string, difficulty: string): {
    mora: number;
    primogens: number;
    artifacts: number;
    materials: string[];
  } {
    const raid = this.getRaid(raidId);
    if (!raid) {
      return { mora: 0, primogens: 0, artifacts: 0, materials: [] };
    }

    const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);
    const rewards = {
      mora: Math.floor(raid.rewards.mora * difficultyMultiplier),
      primogens: Math.floor(raid.rewards.primogens * difficultyMultiplier),
      artifacts: raid.rewards.artifacts,
      materials: raid.rewards.materials
    };

    economyService.addResource(user, 'mora', rewards.mora, `Raid ${raid.name}`);
    economyService.addResource(user, 'primogens', rewards.primogens, `Raid ${raid.name}`);

    return rewards;
  }

  /**
   * Accorde les récompenses de challenge
   */
  static grantChallengeRewards(user: IUser, challengeId: string): {
    mora: number;
    primogens: number;
    starglitter: number;
  } {
    const challenge = this.getChallenge(challengeId);
    if (!challenge) {
      return { mora: 0, primogens: 0, starglitter: 0 };
    }

    economyService.addResource(user, 'mora', challenge.rewards.mora, `Challenge ${challenge.name}`);
    economyService.addResource(user, 'primogens', challenge.rewards.primogens, `Challenge ${challenge.name}`);
    economyService.addResource(user, 'starglitter', challenge.rewards.starglitter, `Challenge ${challenge.name}`);

    return challenge.rewards;
  }

  /**
   * Calcule le score d'un raid basé sur la performance
   */
  static calculateRaidScore(instance: RaidInstance, timeElapsed: number): {
    score: number;
    stars: number;
    rank: string;
  } {
    const raid = this.getRaid(instance.raidId);
    if (!raid) {
      return { score: 0, stars: 0, rank: 'F' };
    }

    const timeLimit = raid.timeLimit * 60; // en secondes
    const timeScore = Math.max(0, 1 - (timeElapsed / timeLimit)) * 100;
    
    const damageScore = Math.min(100, (instance.damageDealt[instance.participants[0]] || 0) / 10000);
    
    const totalScore = (timeScore + damageScore) / 2;
    
    let stars = 0;
    let rank = 'F';
    
    if (totalScore >= 90) {
      stars = 3;
      rank = 'S';
    } else if (totalScore >= 75) {
      stars = 2;
      rank = 'A';
    } else if (totalScore >= 60) {
      stars = 1;
      rank = 'B';
    } else if (totalScore >= 40) {
      stars = 0;
      rank = 'C';
    } else {
      stars = 0;
      rank = 'D';
    }

    return { score: Math.floor(totalScore), stars, rank };
  }

  /**
   * Récupère le classement des raids
   */
  static getRaidLeaderboard(raidId: string, limit: number = 10): Array<{
    userId: string;
    score: number;
    time: number;
    date: Date;
  }> {
    // TODO: Implémenter avec une collection MongoDB dédiée
    return [];
  }

  /**
   * Récupère le classement des challenges
   */
  static getChallengeLeaderboard(challengeId: string, limit: number = 10): Array<{
    userId: string;
    score: number;
    completionTime: number;
    date: Date;
  }> {
    // TODO: Implémenter avec une collection MongoDB dédiée
    return [];
  }
}

export const endgameService = EndgameService;
