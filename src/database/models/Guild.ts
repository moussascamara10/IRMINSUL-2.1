import mongoose, { Schema, Document } from 'mongoose';

export interface IGuild extends Document {
  guildId: string; // Discord guild ID
  name: string;
  ownerId: string;
  description?: string;
  icon?: string;

  // Stats guilde
  level: number;
  xp: number;
  members: number;

  // Ressources
  guildCoins: number;
  treasury: {
    mora: number;
    primogens: number;
  };

  // Settings
  settings: {
    public: boolean;
    requireApplication: boolean;
    minAR: number;
  };

  // Permissions
  roles: {
    master: string[];
    officer: string[];
    member: string[];
  };

  createdAt: Date;
  lastActiveAt: Date;
}

const GuildSchema = new Schema<IGuild>({
  guildId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  ownerId: { type: String, required: true, index: true },
  description: String,
  icon: String,

  level: { type: Number, default: 1, min: 1, max: 10 },
  xp: { type: Number, default: 0, min: 0 },
  members: { type: Number, default: 1, min: 1 },

  guildCoins: { type: Number, default: 0, min: 0 },
  treasury: {
    mora: { type: Number, default: 0, min: 0 },
    primogens: { type: Number, default: 0, min: 0 },
  },

  settings: {
    public: { type: Boolean, default: true },
    requireApplication: { type: Boolean, default: false },
    minAR: { type: Number, default: 1, min: 1, max: 60 },
  },

  roles: {
    master: [{ type: String }],
    officer: [{ type: String }],
    member: [{ type: String }],
  },

  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
});

GuildSchema.index({ ownerId: 1 });
GuildSchema.index({ level: -1 });

export const Guild = mongoose.model<IGuild>('Guild', GuildSchema);
