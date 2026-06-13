import type { ICombatSession, ICombatCharacter, ITurnLogEntry, ICombatReward } from './types/combat.types.js';
import { CombatEngine, IBossBase } from '../../services/CombatEngine.js';
import { ELEMENT_EMOJIS } from '../../builders/IrminsulEmbed.js';

// Mock Redis pour l'instant (à remplacer par vrai Redis)
const redis = {
  async setex(key: string, ttl: number, value: string): Promise<void> {
    // TODO: Implémenter vrai Redis
  },
  async get(key: string): Promise<string | null> {
    // TODO: Implémenter vrai Redis
    return null;
  },
  async del(key: string): Promise<void> {
    // TODO: Implémenter vrai Redis
  }
};

// Mock repositories (à remplacer par vrais repositories)
const BossRepository = {
  async findById(id: string): Promise<IBossBase | null> {
    // TODO: Implémenter vrai repository
    return null;
  }
};

const CombatLogRepository = {
  async create(data: any): Promise<void> {
    // TODO: Implémenter vrai repository
  }
};

const UserRepository = {
  async incrementStat(userId: string, stat: string, value: number): Promise<void> {
    // TODO: Implémenter vrai repository
  },
  async consumeResin(userId: string, amount: number): Promise<void> {
    // TODO: Implémenter vrai repository
  }
};

const AchievementService = {
  async check(userId: string, type: string, data: any): Promise<void> {
    // TODO: Implémenter vrai service
  }
};

const EconomyService = {
  async applyRewards(userId: string, rewards: ICombatReward): Promise<void> {
    // TODO: Implémenter vrai service
  }
};

// Constantes
const WORLD_LEVEL_HP_MULTIPLIERS: Record<number, number> = {
  0: 1.0, 1: 1.3, 2: 1.7, 3: 2.2, 4: 3.0, 5: 4.0, 6: 5.5, 7: 7.5, 8: 10.0
};

const ACTION_LABELS: Record<string, string> = {
  normal: 'Attaque Normale',
  skill:  'Compétence Élémentaire',
  burst:  'Déchaînement Élémentaire',
  swap:   'Changement de Personnage'
};

const ENERGY_GAIN_PER_ACTION: Record<string, number> = {
  normal: 8,
  skill:  15,
  burst:  0
};

export class CombatSessionManager {

  static async initSession(
    userId: string,
    boss: IBossBase,
    team: ICombatCharacter[],
    threadId: string,
    worldLevel: number
  ): Promise<ICombatSession> {

    const bossHp = Math.floor(boss.baseHp * (WORLD_LEVEL_HP_MULTIPLIERS[worldLevel] || 1.0));

    const session: ICombatSession = {
      sessionId: `combat:${userId}:${Date.now()}`,
      userId,
      bossId: boss.id,
      threadId,
      messageId: '',
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
      lastTurnLog: [],
      worldLevel
    };

    await redis.setex(session.sessionId, 1800, JSON.stringify(session));
    return session;
  }

  static async resolveTurn(
    sessionId: string,
    playerAction: 'normal' | 'skill' | 'burst' | 'swap' | 'flee',
    swapTargetIndex?: number
  ): Promise<{ session: ICombatSession; turnLog: ITurnLogEntry[]; ended: boolean }> {

    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session de combat introuvable');

    const turnLog: ITurnLogEntry[] = [];
    let ended = false;

    // Phase 1 : Action du joueur
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
      const activeChar = session.team[session.activeCharacterIndex];
      const boss = await BossRepository.findById(session.bossId);
      if (!boss) throw new Error('Boss introuvable');

      // Vérifier cooldowns
      if (playerAction === 'skill' && session.skillCooldown > 0) {
        return this.resolveTurn(sessionId, 'normal', undefined);
      }
      if (playerAction === 'burst' && (session.burstEnergy < 100 || session.burstCooldown > 0)) {
        return this.resolveTurn(sessionId, 'normal', undefined);
      }

      // Calculer dégâts (seulement pour normal, skill, burst)
      if (playerAction === 'swap') {
        return this.resolveTurn(sessionId, 'normal', undefined);
      }
      const dmgResult = CombatEngine.calculateDamage(activeChar, boss, playerAction as 'normal' | 'skill' | 'burst', session.worldLevel || 0);

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
      session.bossElementStatus = reactionResult.newStatus ?? undefined;

      const logEntry: ITurnLogEntry = {
        actor: 'player',
        action: ACTION_LABELS[playerAction],
        damage: totalDmg,
        isCrit: dmgResult.isCrit,
        reaction: reactionResult.reactionName ?? undefined,
        element: activeChar.element
      };
      turnLog.push(logEntry);

      // Gérer effets spéciaux
      if (reactionResult.specialEffect === 'freeze_2turns') {
        session.bossDebuffs.push({ type: 'freeze', turnsRemaining: 2 });
      }
      if (reactionResult.specialEffect === 'def_shred_40') {
        session.bossDefShred = 0.4;
      }

      // Cooldowns et énergie
      if (playerAction === 'skill') {
        session.skillCooldown = boss.skillCooldown || 4;
      }
      if (playerAction === 'burst') {
        session.burstEnergy = 0;
        session.burstCooldown = 15;
      }

      session.burstEnergy = Math.min(100, session.burstEnergy + (ENERGY_GAIN_PER_ACTION[playerAction] || 0));
    }

    // Vérifier fin de combat
    if (session.bossCurrentHp <= 0) {
      await this.endCombat(sessionId, 'victory');
      return { session, turnLog, ended: true };
    }

    // Vérifier changement de phase
    const boss = await BossRepository.findById(session.bossId);
    if (boss) {
      const newPhase = this.calculatePhase(session.bossCurrentHp, session.bossMaxHp, boss);
      if (newPhase > session.bossPhase) {
        session.bossPhase = newPhase;
        turnLog.push({
          actor: 'boss',
          action: `⚡ PHASE ${newPhase} — ${boss.phases?.[newPhase - 1]?.name || 'Mode Enragé'} !`
        });
      }
    }

    // Phase 2 : Tour du boss
    const isFrozen = session.bossDebuffs.some(d => d.type === 'freeze');

    if (!isFrozen && boss) {
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

      if (target.currentHp <= 0) {
        turnLog.push({ actor: 'boss', action: `💀 ${target.name} est K.O. !` });

        const nextAlive = session.team.findIndex((c, i) => i !== session.activeCharacterIndex && c.currentHp > 0);
        if (nextAlive !== -1) {
          session.activeCharacterIndex = nextAlive;
          turnLog.push({ actor: 'player', action: `Auto-swap vers ${session.team[nextAlive].name}` });
        } else {
          await this.endCombat(sessionId, 'defeat');
          return { session, turnLog: [...turnLog, { actor: 'boss', action: '💀 DÉFAITE — Toute l\'équipe est KO !' }], ended: true };
        }
      }
    } else {
      turnLog.push({ actor: 'boss', action: '❄️ Congelé — Le boss ne peut pas agir !' });
      session.bossDebuffs = session.bossDebuffs
        .map(d => ({ ...d, turnsRemaining: d.turnsRemaining - 1 }))
        .filter(d => d.turnsRemaining > 0);
    }

    // Tick cooldowns
    session.skillCooldown = Math.max(0, session.skillCooldown - 1);
    session.burstCooldown = Math.max(0, session.burstCooldown - 1);
    session.turn++;

    session.lastTurnLog = turnLog;
    await redis.setex(sessionId, 1800, JSON.stringify(session));

    return { session, turnLog, ended: false };
  }

  private static selectBossAttack(boss: IBossBase, phase: number): any {
    const availableAttacks = boss.attacks?.filter((a: any) => a.minPhase <= phase) || [];
    if (availableAttacks.length === 0) return { name: 'Attaque basique', multiplier: 1.0 };

    const weights = availableAttacks.map((a: any) => a.weight * (a.minPhase === phase ? 1.5 : 1));
    const totalWeight = weights.reduce((sum: number, w: number) => sum + w, 0);

    let random = Math.random() * totalWeight;
    for (let i = 0; i < availableAttacks.length; i++) {
      random -= weights[i];
      if (random <= 0) return availableAttacks[i];
    }
    return availableAttacks[availableAttacks.length - 1];
  }

  private static calculateBossDamage(boss: IBossBase, session: ICombatSession, attack: any): number {
    const baseDmg = boss.baseDamage * (attack.multiplier || 1.0);
    const defReduction = session.bossDefShred || 0;

    const charDef = session.team[session.activeCharacterIndex].def;
    const defMult = charDef / (charDef + 1000);
    const finalDmg = Math.floor(baseDmg * (1 - defMult) * (1 - defReduction));

    return Math.random() < 0.15 ? Math.floor(finalDmg * 1.5) : finalDmg;
  }

  static async endCombat(sessionId: string, result: 'victory' | 'defeat' | 'fled'): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    await redis.del(sessionId);

    if (result === 'victory') {
      await this.distributeRewards(session);
    }

    const duration = Math.floor((Date.now() - session.startTime) / 1000);
    await CombatLogRepository.create({
      userId: session.userId,
      bossId: session.bossId,
      result,
      turns: session.turn,
      duration,
      sessionId
    });

    if (result === 'victory') {
      await UserRepository.incrementStat(session.userId, 'bossKills', 1);
      await AchievementService.check(session.userId, 'boss_kill', { bossId: session.bossId });
    }
  }

  private static async distributeRewards(session: ICombatSession): Promise<ICombatReward> {
    const boss = await BossRepository.findById(session.bossId);
    if (!boss) throw new Error('Boss introuvable');

    await UserRepository.consumeResin(session.userId, boss.resinCost || 40);

    const rewards: ICombatReward = {
      mora: 0,
      adventureXP: 0,
      characterXP: 0,
      drops: []
    };

    // TODO: Implémenter logique de récompenses complète
    await EconomyService.applyRewards(session.userId, rewards);

    return rewards;
  }

  static async getSession(sessionId: string): Promise<ICombatSession | null> {
    const data = await redis.get(sessionId);
    return data ? JSON.parse(data) : null;
  }

  private static calculatePhase(currentHp: number, maxHp: number, boss: IBossBase): number {
    const hpPercent = currentHp / maxHp;
    if ((boss.phases?.length || 0) >= 3 && hpPercent < 0.2) return 3;
    if ((boss.phases?.length || 0) >= 2 && hpPercent < 0.5) return 2;
    return 1;
  }
}
