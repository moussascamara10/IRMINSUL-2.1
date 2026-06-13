import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  discordId: string;
  username: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  lastActiveAt: Date;

  // Progression
  adventureRank: number;
  adventureRankXP: number;
  worldLevel: number;
  reputation: {
    mondstadt: number;
    liyue: number;
    inazuma: number;
    sumeru: number;
    fontaine: number;
    natlan: number;
  };

  // Ressources
  mora: number;
  primogens: number;
  fatesIntertwined: number;
  fatesAcquaint: number;
  stardust: number;
  starglitter: number;
  resin: number;
  lastResinUpdate: Date;
  condensedResin: number;

  // Équipe active
  activeTeam: string[]; // character IDs

  // Statistiques
  totalPulls: number;
  totalCharacters: number;
  totalWeapons: number;
  totalArtifacts: number;

  // Guilde
  guildId?: string;
  guildRole?: string;
  guildContribution: number;

  // Gacha Pity (stocké proprement)
  gachaPity: {
    standard: number;
    character: number;
    weapon: number;
  };
  gachaGuaranteed: {
    standard: boolean;
    character: boolean;
    weapon: boolean;
  };
  
  // Compassion Pity (série de pulls sans 5★)
  dryStreak: number;
  compassionBonus: number; // Bonus de taux de 5★ basé sur la série sèche

  // Flags
  tutorialCompleted: boolean;
  isBanned: boolean;
  banReason?: string;
}

const UserSchema = new Schema<IUser>({
  discordId: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  avatar: String,
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },

  adventureRank: { type: Number, default: 1, min: 1, max: 60 },
  adventureRankXP: { type: Number, default: 0, min: 0 },
  worldLevel: { type: Number, default: 0, min: 0, max: 8 },
  reputation: {
    mondstadt: { type: Number, default: 0, min: 0, max: 10 },
    liyue: { type: Number, default: 0, min: 0, max: 10 },
    inazuma: { type: Number, default: 0, min: 0, max: 10 },
    sumeru: { type: Number, default: 0, min: 0, max: 10 },
    fontaine: { type: Number, default: 0, min: 0, max: 10 },
    natlan: { type: Number, default: 0, min: 0, max: 10 },
  },

  mora: { type: Number, default: 0, min: 0 },
  primogens: { type: Number, default: 0, min: 0 },
  fatesIntertwined: { type: Number, default: 0, min: 0 },
  fatesAcquaint: { type: Number, default: 0, min: 0 },
  stardust: { type: Number, default: 0, min: 0 },
  starglitter: { type: Number, default: 0, min: 0 },
  resin: { type: Number, default: 160, min: 0, max: 200 },
  lastResinUpdate: { type: Date, default: Date.now },
  condensedResin: { type: Number, default: 0, min: 0, max: 5 },

  activeTeam: [{ type: String }],

  totalPulls: { type: Number, default: 0, min: 0 },
  totalCharacters: { type: Number, default: 0, min: 0 },
  totalWeapons: { type: Number, default: 0, min: 0 },
  totalArtifacts: { type: Number, default: 0, min: 0 },

  guildId: String,
  guildRole: String,
  guildContribution: { type: Number, default: 0, min: 0 },

  gachaPity: {
    standard: { type: Number, default: 0, min: 0 },
    character: { type: Number, default: 0, min: 0 },
    weapon: { type: Number, default: 0, min: 0 }
  },
  gachaGuaranteed: {
    standard: { type: Boolean, default: false },
    character: { type: Boolean, default: false },
    weapon: { type: Boolean, default: false }
  },
  
  dryStreak: { type: Number, default: 0, min: 0 },
  compassionBonus: { type: Number, default: 0, min: 0, max: 0.5 },

  tutorialCompleted: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  banReason: String,
});

UserSchema.index({ discordId: 1 });
UserSchema.index({ adventureRank: 1 });
UserSchema.index({ guildId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
