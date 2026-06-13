export interface ICombatSession {
  sessionId: string;
  userId: string;
  bossId: string;
  threadId: string;
  messageId: string;
  startTime: number;
  turn: number;

  // Boss state
  bossCurrentHp: number;
  bossMaxHp: number;
  bossPhase: number;
  bossDebuffs: IStatusEffect[];
  bossElementInfused?: string;
  bossElementStatus?: string;
  bossDefShred?: number;

  // Team state
  activeCharacterIndex: number;
  team: ICombatCharacter[];

  // Cooldowns compétences (en tours)
  skillCooldown: number;
  burstCooldown: number;
  burstEnergy: number;

  // Réactions élémentaires actives
  elementalReactions: IElementalStatus[];

  // Résultat du dernier tour (pour l'affichage)
  lastTurnLog: ITurnLogEntry[];
  worldLevel?: number;
}

export interface ICombatCharacter {
  characterId: string;
  name: string;
  element: string;
  level: number;
  currentHp: number;
  maxHp: number;

  // Stats calculées (après armes + artefacts)
  atk: number;
  def: number;
  critRate: number;
  critDmg: number;
  elementalMastery: number;
  energyRecharge: number;

  // Bonus élémentaires
  elementalBonus: Partial<Record<string, number>>;
  physicalBonus: number;
}

export interface IStatusEffect {
  type: 'freeze' | 'burn' | 'wet' | 'superconduct' | 'crystallize';
  turnsRemaining: number;
  value?: number;
}

export interface IElementalStatus {
  element: string;
  turnsRemaining: number;
}

export interface ITurnLogEntry {
  actor: 'player' | 'boss';
  action: string;
  damage?: number;
  isCrit?: boolean;
  reaction?: string;
  statusApplied?: string;
  element?: string;
}

export interface IDamageResult {
  damage: number;
  isCrit: boolean;
  element: string;
}

export interface IReactionResult {
  reactionName: string | null;
  bonusDamage: number;
  newStatus: string | null;
  specialEffect?: string;
}

export interface IReactionConfig {
  name: string;
  type: string;
  baseMultiplier: number;
  persistStatus: string | null;
  specialEffect?: string;
}

export interface ICombatReward {
  mora: number;
  adventureXP: number;
  characterXP: number;
  drops: Array<{ itemId: string; quantity: number }>;
}
