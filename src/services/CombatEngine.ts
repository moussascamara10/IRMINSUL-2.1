import type { ICombatCharacter, IDamageResult, IReactionResult, IReactionConfig } from '../modules/combat/types/combat.types.js';

export interface IBossBase {
  id: string;
  name: string;
  element: string;
  baseHp: number;
  baseDamage: number;
  level?: number;
  resistances: Record<string, number>;
  attacks?: any[];
  phases?: any[];
  skillCooldown?: number;
  resinCost?: number;
  spriteUrl?: string;
  bannerImageUrl?: string;
  lore?: string;
  arXPReward?: number;
  baseMora?: number;
  dropTable?: any[];
  gemRewards?: string[];
}

export class CombatEngine {

  // ============================================================
  // CALCUL PRINCIPAL DES DÉGÂTS
  // ============================================================

  static calculateDamage(
    attacker: ICombatCharacter,
    defender: IBossBase,
    action: 'normal' | 'skill' | 'burst',
    worldLevel: number
  ): IDamageResult {

    // 1. ATK de base du multiplicateur selon l'action
    const talentMultiplier = TALENT_MULTIPLIERS[action][attacker.level] || 1.0;

    // 2. ATK total
    const atkTotal = attacker.atk;

    // 3. Dégâts de base
    let baseDmg = atkTotal * talentMultiplier;

    // 4. Bonus élémentaire
    const elemBonus = attacker.elementalBonus[attacker.element] || 0;
    const physBonus = action === 'normal' ? attacker.physicalBonus : 0;
    baseDmg *= (1 + elemBonus + physBonus);

    // 5. Résistance ennemie
    const resistance = defender.resistances[attacker.element] || 0.1;
    const resMult = this.calculateResistanceMultiplier(resistance);
    baseDmg *= resMult;

    // 6. Défense ennemie
    const defMult = this.calculateDefenseMultiplier(attacker.level, defender.level || worldLevel * 5 + 20);
    baseDmg *= defMult;

    // 7. Critique
    const isCrit = Math.random() < attacker.critRate;
    if (isCrit) {
      baseDmg *= attacker.critDmg;
    }

    // 8. Arrondir
    const finalDamage = Math.floor(baseDmg);

    return { damage: finalDamage, isCrit, element: attacker.element };
  }

  private static calculateResistanceMultiplier(resistance: number): number {
    if (resistance < 0) {
      return 1 - resistance / 2;
    } else if (resistance < 0.75) {
      return 1 - resistance;
    } else {
      return 1 / (4 * resistance + 1);
    }
  }

  private static calculateDefenseMultiplier(attackerLevel: number, defenderLevel: number): number {
    return (attackerLevel + 100) / (attackerLevel + defenderLevel + 200);
  }

  // ============================================================
  // RÉACTIONS ÉLÉMENTAIRES
  // ============================================================

  static applyElementalReaction(
    attackerElement: string,
    existingStatus: string | null,
    attackerEM: number,
    damage: number
  ): IReactionResult {

    if (!existingStatus) {
      return { reactionName: null, bonusDamage: 0, newStatus: attackerElement };
    }

    const reaction = ELEMENTAL_REACTIONS[existingStatus as keyof typeof ELEMENTAL_REACTIONS]?.[attackerElement as keyof typeof ELEMENTAL_REACTIONS[keyof typeof ELEMENTAL_REACTIONS]];
    if (!reaction) {
      return { reactionName: null, bonusDamage: 0, newStatus: attackerElement };
    }

    const emBonus = this.calculateEMBonus(attackerEM, reaction.type);
    const bonusDamage = Math.floor(reaction.baseMultiplier * (1 + emBonus) * damage);

    return {
      reactionName: reaction.name,
      bonusDamage,
      newStatus: reaction.persistStatus || null,
      specialEffect: reaction.specialEffect
    };
  }

  private static calculateEMBonus(em: number, reactionType: string): number {
    if (['vaporize', 'melt'].includes(reactionType)) {
      return 2.78 * em / (em + 1400);
    }
    return 16 * em / (em + 2000);
  }
}

// ============================================================
// TABLE DES RÉACTIONS ÉLÉMENTAIRES
// ============================================================

const ELEMENTAL_REACTIONS: Record<string, Partial<Record<string, IReactionConfig>>> = {
  Pyro: {
    Hydro:   { name: '💧🔥 Vaporisation', type: 'vaporize', baseMultiplier: 1.5, persistStatus: null },
    Cryo:    { name: '🔥❄️ Fusion',       type: 'melt',     baseMultiplier: 2.0, persistStatus: null },
    Electro: { name: '🔥⚡ Surchauffe',   type: 'overload',  baseMultiplier: 2.0, persistStatus: null, specialEffect: 'knockback' },
    Dendro:  { name: '🔥🌿 Embrasement',  type: 'burning',   baseMultiplier: 0.5, persistStatus: 'Pyro' },
  },
  Hydro: {
    Pyro:    { name: '💧🔥 Vaporisation', type: 'vaporize', baseMultiplier: 2.0, persistStatus: null },
    Cryo:    { name: '💧❄️ Congélation',  type: 'freeze',   baseMultiplier: 0,   persistStatus: 'Cryo', specialEffect: 'freeze_2turns' },
    Electro: { name: '💧⚡ Electro-Chargé', type: 'ec',     baseMultiplier: 1.2, persistStatus: 'Hydro' },
    Dendro:  { name: '💧🌿 Floraison',    type: 'bloom',    baseMultiplier: 2.0, persistStatus: null },
  },
  Cryo: {
    Pyro:    { name: '❄️🔥 Fusion',       type: 'melt',     baseMultiplier: 1.5, persistStatus: null },
    Hydro:   { name: '❄️💧 Congélation',  type: 'freeze',   baseMultiplier: 0,   persistStatus: 'Cryo', specialEffect: 'freeze_2turns' },
    Electro: { name: '❄️⚡ Superconducteur', type: 'sc',    baseMultiplier: 0.5, persistStatus: null, specialEffect: 'def_shred_40' },
  },
  Electro: {
    Pyro:    { name: '⚡🔥 Surchauffe',   type: 'overload',  baseMultiplier: 2.0, persistStatus: null },
    Hydro:   { name: '⚡💧 Electro-Chargé', type: 'ec',      baseMultiplier: 1.2, persistStatus: 'Electro' },
    Cryo:    { name: '⚡❄️ Superconducteur', type: 'sc',     baseMultiplier: 0.5, persistStatus: null, specialEffect: 'def_shred_40' },
    Dendro:  { name: '⚡🌿 Intensification', type: 'quicken', baseMultiplier: 0,  persistStatus: 'Quicken' },
  },
  Geo: {
    Pyro:    { name: '⛰️🔥 Cristallisation', type: 'crystallize', baseMultiplier: 0, persistStatus: null, specialEffect: 'shield_pyro' },
    Hydro:   { name: '⛰️💧 Cristallisation', type: 'crystallize', baseMultiplier: 0, persistStatus: null, specialEffect: 'shield_hydro' },
    Cryo:    { name: '⛰️❄️ Cristallisation', type: 'crystallize', baseMultiplier: 0, persistStatus: null, specialEffect: 'shield_cryo' },
    Electro: { name: '⛰️⚡ Cristallisation', type: 'crystallize', baseMultiplier: 0, persistStatus: null, specialEffect: 'shield_electro' },
  },
  Anemo: {
    Pyro:    { name: '🌪️🔥 Tourbillon Pyro',    type: 'swirl', baseMultiplier: 0.6, persistStatus: null },
    Hydro:   { name: '🌪️💧 Tourbillon Hydro',   type: 'swirl', baseMultiplier: 0.6, persistStatus: null },
    Cryo:    { name: '🌪️❄️ Tourbillon Cryo',    type: 'swirl', baseMultiplier: 0.6, persistStatus: null },
    Electro: { name: '🌪️⚡ Tourbillon Électro', type: 'swirl', baseMultiplier: 0.6, persistStatus: null },
  },
  Dendro: {
    Pyro:    { name: '🌿🔥 Embrasement',    type: 'burning',   baseMultiplier: 0.5, persistStatus: 'Pyro' },
    Hydro:   { name: '🌿💧 Floraison',      type: 'bloom',     baseMultiplier: 2.0, persistStatus: null },
    Electro: { name: '🌿⚡ Intensification', type: 'quicken',  baseMultiplier: 0,   persistStatus: 'Quicken' },
  },
  Physique: {},
  Quicken: {
    Dendro:  { name: '🌿🌿 Prolifération', type: 'spread',    baseMultiplier: 1.25, persistStatus: 'Quicken' },
    Electro: { name: '⚡⚡ Aggravation',   type: 'aggravate', baseMultiplier: 1.15, persistStatus: 'Quicken' },
  }
} as any;

// ============================================================
// CONSTANTES DE TALENT
// ============================================================

const TALENT_MULTIPLIERS: Record<string, Record<number, number>> = {
  normal: { 1: 0.8, 6: 1.2, 10: 1.8 },
  skill:  { 1: 1.5, 6: 2.0, 10: 2.8 },
  burst:  { 1: 3.0, 6: 4.5, 10: 6.0 }
};
