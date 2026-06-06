import type { ICharacterOwned, IUser } from '../database/models/index.js';
import { CharacterData } from './GenshinDataService.js';
import { progressionService } from './ProgressionService.js';
import { economyService } from './EconomyService.js';

export interface CombatStats {
  hp: number;
  atk: number;
  def: number;
  em: number;
  critRate: number;
  critDmg: number;
  elementalBonus: number;
}

export interface CombatCharacter {
  character: ICharacterOwned;
  characterData: CharacterData;
  stats: CombatStats;
  currentHP: number;
  energy: number;
}

export interface BossStats {
  name: string;
  hp: number;
  maxHP: number;
  atk: number;
  def: number;
  element: string;
  resistances: { [element: string]: number };
}

export class CombatEngine {
  calculateCharacterStats(character: ICharacterOwned, characterData: CharacterData, user: IUser): CombatStats {
    // Stats de base du personnage depuis genshin-db (lecture seule)
    const baseHP = characterData.stats.baseHP;
    const baseATK = characterData.stats.baseATK;
    const baseDEF = characterData.stats.baseDEF;

    // Multiplicateur selon le niveau (progression réelle)
    const levelMultiplier = 1 + (character.level * 0.1);
    
    // Bonus d'ascension (progression réelle)
    const ascensionBonus = character.ascension * 0.1;

    // Bonus World Level (progression utilisateur)
    const worldLevelBonus = user.worldLevel * 0.05;

    // Stats calculés avec progression
    const stats: CombatStats = {
      hp: Math.floor(baseHP * levelMultiplier * (1 + ascensionBonus + worldLevelBonus)),
      atk: Math.floor(baseATK * levelMultiplier * (1 + ascensionBonus + worldLevelBonus)),
      def: Math.floor(baseDEF * levelMultiplier * (1 + ascensionBonus + worldLevelBonus)),
      em: 0, // À calculer avec les artefacts
      critRate: 5 + (character.constellation * 1), // Bonus constellation
      critDmg: 50 + (character.constellation * 5), // Bonus constellation
      elementalBonus: 0 // À calculer avec les artefacts
    };

    // TODO: Ajouter les stats des artefacts
    // TODO: Ajouter les stats de l'arme
    // TODO: Ajouter les bonus de talents

    return stats;
  }

  calculateDamage(
    attacker: CombatCharacter,
    defender: BossStats,
    skillMultiplier: number
  ): { damage: number; isCrit: boolean; element: string } {
    const stats = attacker.stats;
    const isCrit = Math.random() < stats.critRate / 100;
    
    // Dégâts de base
    let damage = stats.atk * skillMultiplier;

    // Bonus élémentaire
    damage *= (1 + stats.elementalBonus / 100);

    // Résistance élémentaire
    const resistance = defender.resistances[characterDataToElement(attacker.characterData)] || 0;
    const resistanceMultiplier = resistance >= 0 
      ? (1 - resistance / 100) 
      : (1 - resistance / 200);
    damage *= resistanceMultiplier;

    // Défense
    const defMultiplier = (attacker.character.level + 100) / (attacker.character.level + 100 + defender.def);
    damage *= defMultiplier;

    // Critique
    if (isCrit) {
      damage *= (1 + stats.critDmg / 100);
    }

    return {
      damage: Math.floor(damage),
      isCrit,
      element: attacker.characterData.element
    };
  }

  calculateBossHP(bossId: string, user: IUser, teamLevel: number): number {
    // HP de base du boss
    const baseHP = 100000;
    
    // Multiplicateur World Level (progression utilisateur)
    const wlMultiplier = 1 + (user.worldLevel * 0.15);
    
    // Multiplicateur AR (progression utilisateur)
    const arMultiplier = 1 + (user.adventureRank / 60 * 0.3);
    
    // Multiplicateur niveau équipe (progression personnages)
    const teamMultiplier = 1 + (teamLevel / 90 * 0.5);
    
    return Math.floor(baseHP * wlMultiplier * arMultiplier * teamMultiplier);
  }

  calculateBossAttack(bossId: string, user: IUser): number {
    const baseATK = 2000;
    // Multiplicateur selon World Level et AR
    const wlMultiplier = 1 + (user.worldLevel * 0.1);
    const arMultiplier = 1 + (user.adventureRank / 60 * 0.2);
    return Math.floor(baseATK * wlMultiplier * arMultiplier);
  }

  calculateBossDefense(bossId: string, user: IUser): number {
    const baseDEF = 500;
    // Multiplicateur selon World Level et AR
    const wlMultiplier = 1 + (user.worldLevel * 0.1);
    const arMultiplier = 1 + (user.adventureRank / 60 * 0.2);
    return Math.floor(baseDEF * wlMultiplier * arMultiplier);
  }

  calculateReactionDamage(
    element1: string,
    element2: string,
    em: number,
    level: number
  ): number {
    // Tableau des réactions élémentaires
    const reactions: { [key: string]: number } = {
      'pyro-hydro': 2,
      'pyro-cryo': 2,
      'pyro-electro': 1.5,
      'hydro-electro': 1.2,
      'hydro-cryo': 1,
      'electro-cryo': 1.5,
      'pyro-dendro': 1.5,
      'hydro-dendro': 1,
      'electro-dendro': 1.5,
      'cryo-dendro': 1
    };

    const reactionKey = [element1, element2].sort().join('-');
    const multiplier = reactions[reactionKey] || 1;

    // Formule de dégâts de réaction
    const baseDamage = (em * 1.6 + level * 9) * multiplier / 1000;
    
    return Math.floor(baseDamage);
  }

  calculateTeamSynergy(team: CombatCharacter[]): number {
    let synergyBonus = 0;

    // Bonus d'élément (2+ du même élément)
    const elementCounts: { [element: string]: number } = {};
    team.forEach(char => {
      const element = char.characterData.element;
      elementCounts[element] = (elementCounts[element] || 0) + 1;
    });

    Object.values(elementCounts).forEach(count => {
      if (count >= 2) synergyBonus += 0.15; // +15% DMG
      if (count >= 4) synergyBonus += 0.1; // +10% DMG supplémentaire
    });

    return synergyBonus;
  }

  canAffordBoss(user: IUser): boolean {
    return economyService.canAffordResin(user, 'boss');
  }

  deductBossCost(user: IUser): boolean {
    const result = economyService.deductResinCost(user, 'boss');
    return result.success;
  }

  grantBossRewards(user: IUser): { mora: number; xp: number; artifacts: number } {
    return economyService.grantBossReward(user, user.worldLevel);
  }

  canAffordDomain(user: IUser): boolean {
    return economyService.canAffordResin(user, 'domain');
  }

  deductDomainCost(user: IUser): boolean {
    const result = economyService.deductResinCost(user, 'domain');
    return result.success;
  }

  grantDomainRewards(user: IUser): { mora: number; xp: number; artifacts: number } {
    return economyService.grantDomainReward(user, user.worldLevel);
  }
}

function characterDataToElement(data: CharacterData): string {
  return data.element.toLowerCase();
}

export const combatEngine = new CombatEngine();
