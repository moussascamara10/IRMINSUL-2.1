# DOC 10 — MOTEUR DE COMBAT
## IRMINSUL V2 — Implémentation Technique Complète

> Référence technique pour Devin | TypeScript 5.3+ | Discord.js v14

---

## INTRODUCTION

Ce document spécifie l'implémentation complète du moteur de combat d'IRMINSUL V2. Le combat est tour-par-tour, calculé 100% côté serveur, présenté dans un Thread Discord privé. Ce document contient tout le code nécessaire à Devin pour implémenter le système de bout en bout.

---

## 1. ARCHITECTURE GLOBALE DU COMBAT

```
/boss <nom>
  │
  ├── Validation (résine, existance boss, joueur actif)
  ├── Sélection d'équipe (si équipe par défaut → auto-select)
  ├── Création Thread Discord privé
  ├── Initialisation Session Combat (Redis TTL 30min)
  ├── Post du premier Embed de combat dans le Thread
  │
  └── BOUCLE DE COMBAT (géré par les boutons Discord)
        │
        ├── Joueur clique un bouton (ATK/Skill/Burst/Swap/Fuir)
        ├── Handler bouton → résout l'action joueur
        ├── Calcul dégâts (CombatEngine.ts)
        ├── Vérification réactions élémentaires
        ├── Application dégâts boss
        ├── Tour ennemi → attaque aléatoire pondérée
        ├── Application dégâts équipe
        ├── Vérification fin de combat (HP boss <= 0 ou HP équipe <= 0)
        ├── Si phase change → animation de transition
        └── Edit embed combat avec nouveaux HP
```

---

## 2. TYPES ET INTERFACES

```typescript
// src/modules/combat/types/combat.types.ts

export interface ICombatSession {
  sessionId: string;
  userId: string;
  bossId: string;
  threadId: string;
  messageId: string;        // ID du dernier embed de combat (pour l'éditer)
  startTime: number;
  turn: number;

  // Boss state
  bossCurrentHp: number;
  bossMaxHp: number;
  bossPhase: number;        // 1, 2, 3...
  bossDebuffs: IStatusEffect[];
  bossElementInfused?: ElementType; // Pour Primo Geovishap

  // Team state
  activeCharacterIndex: number; // 0-3
  team: ICombatCharacter[];

  // Cooldowns compétences (en tours)
  skillCooldown: number;
  burstCooldown: number;
  burstEnergy: number;      // 0-100 (Burst se déverrouille à 100)

  // Réactions élémentaires actives
  elementalReactions: IElementalStatus[];

  // Résultat du dernier tour (pour l'affichage)
  lastTurnLog: ITurnLogEntry[];
}

export interface ICombatCharacter {
  characterId: string;
  name: string;
  element: ElementType;
  level: number;
  currentHp: number;
  maxHp: number;

  // Stats calculées (après armes + artefacts)
  atk: number;
  def: number;
  critRate: number;        // 0.0 → 1.0
  critDmg: number;         // ex: 1.5 = 150% CRIT DMG
  elementalMastery: number;
  energyRecharge: number;  // ex: 1.2 = 120% ER

  // Bonus élémentaires
  elementalBonus: Partial<Record<ElementType, number>>;
  physicalBonus: number;
}

export interface IStatusEffect {
  type: 'freeze' | 'burn' | 'wet' | 'superconduct' | 'crystallize';
  turnsRemaining: number;
  value?: number; // Dégâts par tour pour burn/poison
}

export type ElementType = 'Pyro' | 'Hydro' | 'Cryo' | 'Electro' | 'Anemo' | 'Geo' | 'Dendro' | 'Physique';

export interface ITurnLogEntry {
  actor: 'player' | 'boss';
  action: string;
  damage?: number;
  isCrit?: boolean;
  reaction?: string;
  statusApplied?: string;
}
```

---

## 3. MOTEUR DE CALCUL DE DÉGÂTS

```typescript
// src/services/CombatEngine.ts

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
    const physBonus = action === 'normal' ? attacker.physicalBonus : 0; // Normal peut être physique
    baseDmg *= (1 + elemBonus + physBonus);

    // 5. Résistance ennemie
    const resistance = defender.resistances[attacker.element] || 0.1; // 10% par défaut
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

    // 8. Arrondir (pas de décimales dans les dégâts Discord)
    const finalDamage = Math.floor(baseDmg);

    return { damage: finalDamage, isCrit, element: attacker.element };
  }

  private static calculateResistanceMultiplier(resistance: number): number {
    if (resistance < 0) {
      return 1 - resistance / 2; // Résistance négative = bonus
    } else if (resistance < 0.75) {
      return 1 - resistance;
    } else {
      return 1 / (4 * resistance + 1); // Au-delà de 75% : diminishing returns
    }
  }

  private static calculateDefenseMultiplier(attackerLevel: number, defenderLevel: number): number {
    // Formule Genshin : (attLevel + 100) / (attLevel + defLevel + 200)
    return (attackerLevel + 100) / (attackerLevel + defenderLevel + 200);
  }

  // ============================================================
  // RÉACTIONS ÉLÉMENTAIRES
  // ============================================================

  static applyElementalReaction(
    attackerElement: ElementType,
    existingStatus: ElementType | null,
    attackerEM: number,
    damage: number
  ): IReactionResult {

    if (!existingStatus) {
      // Pas de réaction → appliquer le statut élémentaire sur le boss
      return { reactionName: null, bonusDamage: 0, newStatus: attackerElement };
    }

    // Table des réactions
    const reaction = ELEMENTAL_REACTIONS[existingStatus]?.[attackerElement];
    if (!reaction) {
      // Écraser le statut précédent
      return { reactionName: null, bonusDamage: 0, newStatus: attackerElement };
    }

    // Calcul des dégâts bonus (basé sur Elemental Mastery)
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
    // Formule : 2.78 * EM / (EM + 1400) pour Vaporisation/Fusion
    // Formule : 16 * EM / (EM + 2000) pour les transformations
    if (['vaporize', 'melt'].includes(reactionType)) {
      return 2.78 * em / (em + 1400);
    }
    return 16 * em / (em + 2000);
  }
}

// ============================================================
// TABLE DES RÉACTIONS ÉLÉMENTAIRES
// ============================================================

const ELEMENTAL_REACTIONS: Record<ElementType, Partial<Record<ElementType, IReactionConfig>>> = {
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
    // Geo cristallise tous les éléments (absorbe l'élément)
    Pyro:    { name: '⛰️🔥 Cristallisation', type: 'crystallize', baseMultiplier: 0, persistStatus: null, specialEffect: 'shield_pyro' },
    Hydro:   { name: '⛰️💧 Cristallisation', type: 'crystallize', baseMultiplier: 0, persistStatus: null, specialEffect: 'shield_hydro' },
    Cryo:    { name: '⛰️❄️ Cristallisation', type: 'crystallize', baseMultiplier: 0, persistStatus: null, specialEffect: 'shield_cryo' },
    Electro: { name: '⛰️⚡ Cristallisation', type: 'crystallize', baseMultiplier: 0, persistStatus: null, specialEffect: 'shield_electro' },
  },
  Anemo: {
    // Anemo aspire l'élément et inflige Swirl (dégâts AoE de l'élément absorbé)
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
```

---

## 4. SESSION COMBAT — CYCLE COMPLET

```typescript
// src/modules/combat/CombatSessionManager.ts

export class CombatSessionManager {

  // ============================================================
  // INITIALISER UN COMBAT
  // ============================================================

  static async initSession(
    userId: string,
    boss: IBossBase,
    team: ICombatCharacter[],
    threadId: string,
    worldLevel: number
  ): Promise<ICombatSession> {

    // HP boss ajusté selon World Level
    const bossHp = Math.floor(boss.baseHp * WORLD_LEVEL_HP_MULTIPLIERS[worldLevel]);

    const session: ICombatSession = {
      sessionId: `combat:${userId}:${Date.now()}`,
      userId,
      bossId: boss.id,
      threadId,
      messageId: '',      // Sera rempli après le premier message
      startTime: Date.now(),
      turn: 1,

      bossCurrentHp: bossHp,
      bossMaxHp: bossHp,
      bossPhase: 1,
      bossDebuffs: [],

      activeCharacterIndex: 0,
      team,

      skillCooldown: 0,
      burstCooldown: 0,
      burstEnergy: 0,

      elementalReactions: [],
      lastTurnLog: []
    };

    // Sauvegarder dans Redis (TTL 30 min)
    await redis.setex(session.sessionId, 1800, JSON.stringify(session));

    return session;
  }

  // ============================================================
  // RÉSOUDRE UN TOUR
  // ============================================================

  static async resolveTurn(
    sessionId: string,
    playerAction: 'normal' | 'skill' | 'burst' | 'swap' | 'flee',
    swapTargetIndex?: number
  ): Promise<{ session: ICombatSession; turnLog: ITurnLogEntry[]; ended: boolean }> {

    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session de combat introuvable');

    const turnLog: ITurnLogEntry[] = [];
    let ended = false;

    // ─── PHASE 1 : Action du joueur ───
    if (playerAction === 'flee') {
      await this.endCombat(sessionId, 'fled');
      return { session, turnLog: [{ actor: 'player', action: 'Fuite !' }], ended: true };
    }

    if (playerAction === 'swap' && swapTargetIndex !== undefined) {
      session.activeCharacterIndex = swapTargetIndex;
      session.skillCooldown = Math.max(0, session.skillCooldown - 1);
      session.burstCooldown = Math.max(0, session.burstCooldown - 1);
      turnLog.push({ actor: 'player', action: `Changement vers ${session.team[swapTargetIndex].name}` });
    } else {
      // Attaque normale, compétence ou burst
      const activeChar = session.team[session.activeCharacterIndex];
      const boss = await BossRepository.findById(session.bossId);

      // Vérifier cooldowns
      if (playerAction === 'skill' && session.skillCooldown > 0) {
        return this.resolveTurn(sessionId, 'normal'); // Fallback sur ATK normale
      }
      if (playerAction === 'burst' && (session.burstEnergy < 100 || session.burstCooldown > 0)) {
        return this.resolveTurn(sessionId, 'normal');
      }

      // Calculer dégâts
      const dmgResult = CombatEngine.calculateDamage(activeChar, boss, playerAction, session.worldLevel || 0);

      // Appliquer réactions
      const bossElement = session.bossElementStatus || null;
      const reactionResult = CombatEngine.applyElementalReaction(
        activeChar.element,
        bossElement,
        activeChar.elementalMastery,
        dmgResult.damage
      );

      const totalDmg = dmgResult.damage + reactionResult.bonusDamage;
      session.bossCurrentHp = Math.max(0, session.bossCurrentHp - totalDmg);
      session.bossElementStatus = reactionResult.newStatus;

      // Logger le tour
      const logEntry: ITurnLogEntry = {
        actor: 'player',
        action: ACTION_LABELS[playerAction],
        damage: totalDmg,
        isCrit: dmgResult.isCrit,
        reaction: reactionResult.reactionName || undefined,
        element: activeChar.element
      };
      turnLog.push(logEntry);

      // Gérer les effets spéciaux des réactions
      if (reactionResult.specialEffect === 'freeze_2turns') {
        session.bossDebuffs.push({ type: 'freeze', turnsRemaining: 2 });
      }
      if (reactionResult.specialEffect === 'def_shred_40') {
        session.bossDefShred = 0.4; // -40% DEF pendant 2 tours
      }

      // Cooldowns et énergie
      if (playerAction === 'skill') {
        session.skillCooldown = boss.skillCooldown || 4;
      }
      if (playerAction === 'burst') {
        session.burstEnergy = 0;
        session.burstCooldown = 15;
      }

      // Regain d'énergie après attaque
      session.burstEnergy = Math.min(100, session.burstEnergy + ENERGY_GAIN_PER_ACTION[playerAction]);
    }

    // ─── Vérifier fin de combat (boss mort) ───
    if (session.bossCurrentHp <= 0) {
      await this.endCombat(sessionId, 'victory');
      return { session, turnLog, ended: true };
    }

    // ─── Vérifier changement de phase ───
    const boss = await BossRepository.findById(session.bossId);
    const newPhase = this.calculatePhase(session.bossCurrentHp, session.bossMaxHp, boss);
    if (newPhase > session.bossPhase) {
      session.bossPhase = newPhase;
      turnLog.push({
        actor: 'boss',
        action: `⚡ PHASE ${newPhase} — ${boss.phases[newPhase - 1]?.name || 'Mode Enragé'} !`
      });
    }

    // ─── PHASE 2 : Tour du boss ───
    const isFrozen = session.bossDebuffs.some(d => d.type === 'freeze');

    if (!isFrozen) {
      const bossAttack = this.selectBossAttack(boss, session.bossPhase);
      const bossDmg = this.calculateBossDamage(boss, session, bossAttack);

      const target = session.team[session.activeCharacterIndex];
      target.currentHp = Math.max(0, target.currentHp - bossDmg);

      turnLog.push({
        actor: 'boss',
        action: bossAttack.name,
        damage: bossDmg,
        element: boss.element
      });

      // Vérifier si le personnage actif est KO
      if (target.currentHp <= 0) {
        turnLog.push({ actor: 'boss', action: `💀 ${target.name} est K.O. !` });

        // Chercher un personnage vivant
        const nextAlive = session.team.findIndex((c, i) => i !== session.activeCharacterIndex && c.currentHp > 0);
        if (nextAlive !== -1) {
          session.activeCharacterIndex = nextAlive;
          turnLog.push({ actor: 'player', action: `Auto-swap vers ${session.team[nextAlive].name}` });
        } else {
          // Toute l'équipe est KO
          await this.endCombat(sessionId, 'defeat');
          return { session, turnLog: [...turnLog, { actor: 'boss', action: '💀 DÉFAITE — Toute l\'équipe est KO !' }], ended: true };
        }
      }
    } else {
      turnLog.push({ actor: 'boss', action: '❄️ Congelé — Le boss ne peut pas agir !' });
      // Décrémenter les debuffs
      session.bossDebuffs = session.bossDebuffs
        .map(d => ({ ...d, turnsRemaining: d.turnsRemaining - 1 }))
        .filter(d => d.turnsRemaining > 0);
    }

    // ─── Tick cooldowns ───
    session.skillCooldown = Math.max(0, session.skillCooldown - 1);
    session.burstCooldown = Math.max(0, session.burstCooldown - 1);
    session.turn++;

    // ─── Sauvegarder la session mise à jour ───
    session.lastTurnLog = turnLog;
    await redis.setex(sessionId, 1800, JSON.stringify(session));

    return { session, turnLog, ended: false };
  }

  // ============================================================
  // SÉLECTION DES ATTAQUES DU BOSS
  // ============================================================

  private static selectBossAttack(boss: IBossBase, phase: number): IBossAttack {
    const availableAttacks = boss.attacks.filter(a => a.minPhase <= phase);

    // Sélection pondérée selon les poids (phase = attaques plus lourdes)
    const weights = availableAttacks.map(a => a.weight * (a.minPhase === phase ? 1.5 : 1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let random = Math.random() * totalWeight;
    for (let i = 0; i < availableAttacks.length; i++) {
      random -= weights[i];
      if (random <= 0) return availableAttacks[i];
    }
    return availableAttacks[availableAttacks.length - 1];
  }

  private static calculateBossDamage(
    boss: IBossBase,
    session: ICombatSession,
    attack: IBossAttack
  ): number {
    const baseDmg = boss.baseDamage * attack.multiplier;
    const defReduction = session.bossDefShred || 0;

    // Appliquer la défense du personnage
    const charDef = session.team[session.activeCharacterIndex].def;
    const defMult = charDef / (charDef + 1000); // Formule simplifiée
    const finalDmg = Math.floor(baseDmg * (1 - defMult) * (1 - defReduction));

    // Attaque critique du boss (15% de chance)
    return Math.random() < 0.15 ? Math.floor(finalDmg * 1.5) : finalDmg;
  }

  // ============================================================
  // FIN DU COMBAT
  // ============================================================

  static async endCombat(sessionId: string, result: 'victory' | 'defeat' | 'fled'): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    // Supprimer la session Redis
    await redis.del(sessionId);

    if (result === 'victory') {
      await this.distributeRewards(session);
    }

    // Logger en MongoDB
    const duration = Math.floor((Date.now() - session.startTime) / 1000);
    await CombatLogRepository.create({
      userId: session.userId,
      bossId: session.bossId,
      result,
      turns: session.turn,
      duration,
      sessionId
    });

    // Stats joueur
    if (result === 'victory') {
      await UserRepository.incrementStat(session.userId, 'bossKills', 1);
      await AchievementService.check(session.userId, 'boss_kill', { bossId: session.bossId });
    }
  }

  // ============================================================
  // DISTRIBUTION DES RÉCOMPENSES
  // ============================================================

  static async distributeRewards(session: ICombatSession): Promise<ICombatReward> {
    const boss = await BossRepository.findById(session.bossId);
    const user = await UserRepository.findByDiscordId(session.userId);

    // Consommer la résine
    await UserRepository.consumeResin(session.userId, boss.resinCost);

    // Générer les récompenses
    const rewards: ICombatReward = {
      mora: 0,
      adventureXP: boss.arXPReward,
      characterXP: 0,
      drops: []
    };

    // Mora selon World Level
    rewards.mora = Math.floor(boss.baseMora * WORLD_LEVEL_HP_MULTIPLIERS[user.worldLevel]);

    // Drops de matériaux (selon table de probabilités du boss)
    for (const drop of boss.dropTable) {
      if (Math.random() < drop.probability) {
        const quantity = Math.floor(Math.random() * (drop.maxQuantity - drop.minQuantity + 1)) + drop.minQuantity;
        rewards.drops.push({ itemId: drop.itemId, quantity });
      }
    }

    // Appliquer les récompenses
    await EconomyService.applyRewards(session.userId, rewards);

    // Gems de boss (toujours garantis)
    const gemReward = boss.gemRewards[Math.floor(Math.random() * boss.gemRewards.length)];
    rewards.drops.push({ itemId: gemReward, quantity: 1 });

    return rewards;
  }

  static async getSession(sessionId: string): Promise<ICombatSession | null> {
    const data = await redis.get(sessionId);
    return data ? JSON.parse(data) : null;
  }

  private static calculatePhase(currentHp: number, maxHp: number, boss: IBossBase): number {
    const hpPercent = currentHp / maxHp;
    if (boss.phases.length >= 3 && hpPercent < 0.2) return 3;
    if (boss.phases.length >= 2 && hpPercent < 0.5) return 2;
    return 1;
  }
}
```

---

## 5. EMBED DE COMBAT — AFFICHAGE EN TEMPS RÉEL

```typescript
// src/modules/combat/builders/CombatEmbedBuilder.ts

export class CombatEmbedBuilder {

  static buildMainEmbed(session: ICombatSession, boss: IBossBase): EmbedBuilder {
    const hpPercent = (session.bossCurrentHp / session.bossMaxHp) * 100;
    const hpBar = this.generateBar(hpPercent, 20, '█', '░');

    // Couleur selon la vie du boss
    const color = hpPercent > 60 ? 0x00AA00 : hpPercent > 30 ? 0xFFAA00 : 0xFF0000;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`⚔️ ${boss.name} — Phase ${session.bossPhase}`)
      .setThumbnail(boss.spriteUrl);

    // HP Boss
    embed.addFields({
      name: `HP Boss ${hpBar} ${hpPercent.toFixed(1)}%`,
      value: `${session.bossCurrentHp.toLocaleString()} / ${session.bossMaxHp.toLocaleString()}`,
      inline: false
    });

    // Statut élémentaire boss
    if (session.bossElementStatus) {
      embed.addFields({
        name: 'Statut Élémentaire',
        value: `${ELEMENT_EMOJIS[session.bossElementStatus]} ${session.bossElementStatus}`,
        inline: true
      });
    }

    // Debuffs boss
    if (session.bossDebuffs.length > 0) {
      const debuffStr = session.bossDebuffs
        .map(d => `${STATUS_EMOJIS[d.type]} ${d.type} (${d.turnsRemaining} tours)`)
        .join('\n');
      embed.addFields({ name: 'Debuffs', value: debuffStr, inline: true });
    }

    // Séparateur
    embed.addFields({ name: '\u200B', value: '──────────────────────', inline: false });

    // Équipe
    session.team.forEach((char, index) => {
      const isActive = index === session.activeCharacterIndex;
      const hpPct = (char.currentHp / char.maxHp) * 100;
      const charHpBar = this.generateBar(hpPct, 8);
      const prefix = isActive ? '▶ ' : '  ';
      const statusIcon = char.currentHp <= 0 ? '💀' : isActive ? ELEMENT_EMOJIS[char.element] : '⚪';

      embed.addFields({
        name: `${prefix}${statusIcon} ${char.name}`,
        value: `${charHpBar} ${hpPct.toFixed(0)}%\n${char.currentHp.toLocaleString()}/${char.maxHp.toLocaleString()} HP`,
        inline: true
      });
    });

    // Burst energy
    const energyBar = this.generateBar(session.burstEnergy, 10, '⚡', '○');
    embed.addFields({
      name: `\u200B`,
      value: `Burst: ${energyBar} ${session.burstEnergy}/100`,
      inline: false
    });

    // Dernier tour (log)
    if (session.lastTurnLog.length > 0) {
      const logText = session.lastTurnLog
        .map(entry => {
          if (entry.actor === 'player') {
            const critStr = entry.isCrit ? ' **CRITIQUE !**' : '';
            const reactionStr = entry.reaction ? ` → ${entry.reaction}` : '';
            return `📗 ${entry.action}${entry.damage ? ` → **${entry.damage.toLocaleString()} DMG**${critStr}${reactionStr}` : ''}`;
          } else {
            return `📕 👹 ${entry.action}${entry.damage ? ` → **-${entry.damage.toLocaleString()} HP**` : ''}`;
          }
        })
        .join('\n');

      embed.addFields({ name: `Tour ${session.turn - 1} — Résumé`, value: logText, inline: false });
    }

    embed.setFooter({ text: `Tour ${session.turn} • Cooldown Skill: ${session.skillCooldown} tours` });

    return embed;
  }

  static buildActionRow(session: ICombatSession): ActionRowBuilder<ButtonBuilder> {
    const activeChar = session.team[session.activeCharacterIndex];

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`combat_normal_${session.sessionId}`)
        .setLabel('⚔️ Attaque')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`combat_skill_${session.sessionId}`)
        .setLabel(session.skillCooldown > 0 ? `🌟 Skill (${session.skillCooldown})` : '🌟 Skill')
        .setStyle(ButtonStyle.Success)
        .setDisabled(session.skillCooldown > 0),

      new ButtonBuilder()
        .setCustomId(`combat_burst_${session.sessionId}`)
        .setLabel(session.burstEnergy < 100 ? `💥 Burst (${session.burstEnergy}%)` : '💥 BURST!')
        .setStyle(session.burstEnergy >= 100 ? ButtonStyle.Danger : ButtonStyle.Secondary)
        .setDisabled(session.burstEnergy < 100 || session.burstCooldown > 0),

      new ButtonBuilder()
        .setCustomId(`combat_swap_${session.sessionId}`)
        .setLabel('🔄 Swap')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`combat_flee_${session.sessionId}`)
        .setLabel('🏃 Fuir')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  static buildSwapMenu(session: ICombatSession): ActionRowBuilder<StringSelectMenuBuilder> {
    const options = session.team
      .map((char, index) => {
        const isActive = index === session.activeCharacterIndex;
        const isDead = char.currentHp <= 0;
        return new StringSelectMenuOptionBuilder()
          .setLabel(`${char.name} (${Math.floor(char.currentHp / char.maxHp * 100)}% HP)`)
          .setValue(`${index}`)
          .setEmoji(ELEMENT_EMOJIS[char.element])
          .setDescription(isActive ? '▶ Personnage actif' : isDead ? '💀 K.O.' : 'Disponible')
          .setDefault(isActive);
      });

    const select = new StringSelectMenuBuilder()
      .setCustomId(`combat_swap_select_${session.sessionId}`)
      .setPlaceholder('Choisir le prochain personnage...')
      .setOptions(options);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  }

  static buildVictoryEmbed(session: ICombatSession, rewards: ICombatReward, boss: IBossBase): EmbedBuilder {
    const duration = Math.floor((Date.now() - session.startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    const rewardsText = [
      `💰 +${rewards.mora.toLocaleString()} Mora`,
      `📊 +${rewards.adventureXP} XP Aventurier`,
      ...rewards.drops.map(d => `📦 ${d.quantity}× ${ITEM_NAMES[d.itemId] || d.itemId}`)
    ].join('\n');

    return new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`✅ VICTOIRE — ${boss.name} vaincu !`)
      .setDescription(`Combat terminé en ${minutes}m ${seconds}s • ${session.turn} tours`)
      .addFields(
        { name: '🎁 Récompenses', value: rewardsText, inline: false }
      )
      .setFooter({ text: 'Le thread sera archivé dans 30 secondes.' });
  }

  private static generateBar(percent: number, length: number, fill = '█', empty = '░'): string {
    const filled = Math.max(0, Math.min(length, Math.round((percent / 100) * length)));
    return fill.repeat(filled) + empty.repeat(length - filled);
  }
}
```

---

## 6. CONSTANTES ET TABLES DE DONNÉES

```typescript
// src/data/combat-constants.ts

// Multiplicateurs des talents selon l'action
export const TALENT_MULTIPLIERS = {
  normal: { /* Level 1: 0.8, Level 6: 1.2, Level 10: 1.8 */ },
  skill:  { /* Level 1: 1.5, Level 6: 2.0, Level 10: 2.8 */ },
  burst:  { /* Level 1: 3.0, Level 6: 4.5, Level 10: 6.0 */ }
} as Record<string, Record<number, number>>;

// HP multipliers selon World Level
export const WORLD_LEVEL_HP_MULTIPLIERS: Record<number, number> = {
  0: 1.0, 1: 1.3, 2: 1.7, 3: 2.2, 4: 3.0, 5: 4.0, 6: 5.5, 7: 7.5, 8: 10.0
};

// Énergie gagnée selon l'action
export const ENERGY_GAIN_PER_ACTION: Record<string, number> = {
  normal: 8,
  skill:  15,
  burst:  0   // Burst ne génère pas d'énergie
};

// Multiplicateur de dégâts pour les réactions selon l'EM
export const EM_REACTION_BONUS = {
  vaporize:    (em: number) => 2.78 * em / (em + 1400),
  melt:        (em: number) => 2.78 * em / (em + 1400),
  overload:    (em: number) => 16 * em / (em + 2000),
  bloom:       (em: number) => 16 * em / (em + 2000),
  ec:          (em: number) => 5 * em / (em + 1200),
  swirl:       (em: number) => 4 * em / (em + 1400),
  crystallize: (em: number) => 4.44 * em / (em + 1400),
};

// Labels des actions
export const ACTION_LABELS: Record<string, string> = {
  normal: 'Attaque Normale',
  skill:  'Compétence Élémentaire',
  burst:  'Déchaînement Élémentaire',
  swap:   'Changement de Personnage'
};

// Emojis de statut
export const STATUS_EMOJIS: Record<string, string> = {
  freeze: '❄️', burn: '🔥', wet: '💧', superconduct: '⚡', crystallize: '💎'
};
```

---

## 7. INTÉGRATION DANS INTERACTIONCREATE

```typescript
// src/modules/combat/handlers/CombatButtonHandler.ts

export class CombatButtonHandler {
  static async handle(interaction: ButtonInteraction, parts: string[]): Promise<void> {
    const [actionType, sessionId] = parts; // ex: ['normal', 'combat:userId:1234567']

    await interaction.deferUpdate(); // IMMÉDIAT — critique pour ne pas timeout

    // Vérifier que c'est bien le bon joueur
    const session = await CombatSessionManager.getSession(`combat:${parts.join('_')}`);
    if (!session) {
      await interaction.followUp({ content: '❌ Session de combat expirée.', ephemeral: true });
      return;
    }
    if (session.userId !== interaction.user.id) {
      await interaction.followUp({ content: '❌ Ce n\'est pas ton combat.', ephemeral: true });
      return;
    }

    // Résoudre le tour
    const { session: updatedSession, turnLog, ended } = await CombatSessionManager.resolveTurn(
      session.sessionId,
      actionType as 'normal' | 'skill' | 'burst' | 'swap' | 'flee'
    );

    const boss = await BossRepository.findById(session.bossId);

    if (ended) {
      const result = updatedSession.bossCurrentHp <= 0 ? 'victory' : 'defeat';
      if (result === 'victory') {
        const rewards = await CombatSessionManager.distributeRewards(updatedSession);
        const victoryEmbed = CombatEmbedBuilder.buildVictoryEmbed(updatedSession, rewards, boss);
        await interaction.editReply({ embeds: [victoryEmbed], components: [] });
      } else {
        await interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('💀 Défaite').setDescription('Ton équipe est K.O.')],
          components: []
        });
      }
      // Archiver le thread après 30s
      setTimeout(() => {
        (interaction.channel as ThreadChannel)?.setArchived(true).catch(() => {});
      }, 30_000);
      return;
    }

    // Mise à jour de l'embed de combat
    const combatEmbed = CombatEmbedBuilder.buildMainEmbed(updatedSession, boss);
    const actionRow = CombatEmbedBuilder.buildActionRow(updatedSession);

    await interaction.editReply({ embeds: [combatEmbed], components: [actionRow] });
  }
}
```

---

## 8. NOTES D'IMPLÉMENTATION IMPORTANTES

```
1. JAMAIS calculer les dégâts côté client (côté Discord)
   → Tout le calcul doit rester dans CombatEngine.ts côté serveur

2. SESSION REDIS → TTL 30min, renouvelé à chaque tour
   → Si le joueur revient après 30min, la session est perdue (combat abandonné)

3. UN SEUL COMBAT PAR JOUEUR à la fois
   → Vérifier au lancement : if (await redis.exists(`combat:active:${userId}`)) → refuser

4. THREAD AUTO-ARCHIVAGE
   → Toujours archiver après la fin du combat (victoire/défaite/fuite)
   → Inactivité > 5 min → archivage automatique

5. INTÉGRITÉ
   → Toujours charger la session depuis Redis avant chaque calcul
   → Ne jamais faire confiance aux données envoyées dans le customId du bouton
   → La session est la source de vérité

6. LOGS MONGODB
   → Logger chaque combat terminé (résultat, durée, tours)
   → Utile pour analytics, succès et équilibrage

7. RÉCOMPENSES ATOMIQUES
   → Utiliser les transactions MongoDB pour les récompenses
   → Vérifier que la résine est disponible AVANT de lancer le combat (pas après)
```
