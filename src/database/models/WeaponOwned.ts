import mongoose, { Schema, Document } from 'mongoose';

export interface IWeaponOwned extends Document {
  userId: string;
  weaponId: string; // ID from genshin-db
  weaponName: string;
  rarity: number;
  type: string;

  // Stats
  level: number;
  xp: number;
  ascension: number;
  refinement: number;

  // Stats de base
  baseStats: {
    baseATK: number;
    subStat: string;
    subStatValue: number;
  };

  equippedBy?: string; // character ID

  obtainedAt: Date;
  lastUsedAt: Date;
}

const WeaponOwnedSchema = new Schema<IWeaponOwned>({
  userId: { type: String, required: true, index: true },
  weaponId: { type: String, required: true },
  weaponName: { type: String, required: true },
  rarity: { type: Number, required: true, min: 3, max: 5 },
  type: { type: String, required: true },

  level: { type: Number, default: 1, min: 1, max: 90 },
  xp: { type: Number, default: 0, min: 0 },
  ascension: { type: Number, default: 0, min: 0, max: 6 },
  refinement: { type: Number, default: 1, min: 1, max: 5 },

  baseStats: {
    baseATK: { type: Number, required: true },
    subStat: { type: String, required: true },
    subStatValue: { type: Number, required: true },
  },

  equippedBy: String,

  obtainedAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
});

WeaponOwnedSchema.index({ userId: 1, weaponId: 1 }, { unique: true });
WeaponOwnedSchema.index({ userId: 1, level: -1 });
WeaponOwnedSchema.index({ userId: 1, rarity: -1 });
WeaponOwnedSchema.index({ equippedBy: 1 });

export const WeaponOwned = mongoose.model<IWeaponOwned>('WeaponOwned', WeaponOwnedSchema);
