import mongoose, { Schema, Document } from 'mongoose';

export interface ICharacterOwned extends Document {
  userId: string;
  characterId: string; // ID from genshin-db
  characterName: string;
  rarity: number;
  element: string;
  weaponType: string;

  // Stats
  level: number;
  xp: number;
  ascension: number;
  constellation: number;
  friendship: number;

  // Talents
  talents: {
    normal: number;
    elemental: number;
    burst: number;
  };

  // Équipement
  weaponId?: string;
  artifacts: {
    flower?: string;
    plume?: string;
    sands?: string;
    goblet?: string;
    circlet?: string;
  };

  // Stats calculés
  stats: {
    hp: number;
    atk: number;
    def: number;
    em: number;
    critRate: number;
    critDmg: number;
    elementalBonus: number;
  };

  obtainedAt: Date;
  lastUsedAt: Date;
}

const CharacterOwnedSchema = new Schema<ICharacterOwned>({
  userId: { type: String, required: true, index: true },
  characterId: { type: String, required: true },
  characterName: { type: String, required: true },
  rarity: { type: Number, required: true, min: 4, max: 5 },
  element: { type: String, required: true },
  weaponType: { type: String, required: true },

  level: { type: Number, default: 1, min: 1, max: 90 },
  xp: { type: Number, default: 0, min: 0 },
  ascension: { type: Number, default: 0, min: 0, max: 6 },
  constellation: { type: Number, default: 0, min: 0, max: 6 },
  friendship: { type: Number, default: 1, min: 1, max: 10 },

  talents: {
    normal: { type: Number, default: 1, min: 1, max: 10 },
    elemental: { type: Number, default: 1, min: 1, max: 10 },
    burst: { type: Number, default: 1, min: 1, max: 10 },
  },

  weaponId: String,
  artifacts: {
    flower: String,
    plume: String,
    sands: String,
    goblet: String,
    circlet: String,
  },

  stats: {
    hp: { type: Number, default: 0 },
    atk: { type: Number, default: 0 },
    def: { type: Number, default: 0 },
    em: { type: Number, default: 0 },
    critRate: { type: Number, default: 5 },
    critDmg: { type: Number, default: 50 },
    elementalBonus: { type: Number, default: 0 },
  },

  obtainedAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
});

CharacterOwnedSchema.index({ userId: 1, characterId: 1 }, { unique: true });
CharacterOwnedSchema.index({ userId: 1, level: -1 });
CharacterOwnedSchema.index({ userId: 1, rarity: -1 });

export const CharacterOwned = mongoose.model<ICharacterOwned>('CharacterOwned', CharacterOwnedSchema);
