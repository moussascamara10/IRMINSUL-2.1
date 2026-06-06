import mongoose, { Schema, Document } from 'mongoose';

export interface IArtifactOwned {
  userId: string;
  artifactId: string; // ID from genshin-db
  artifactName: string;
  rarity: number;
  setName: string;
  slot: string;

  // Stats
  level: number;

  // Stats principaux
  mainStat: {
    type: string;
    value: number;
  };

  // Stats secondaires
  subStats: Array<{
    type: string;
    value: number;
  }>;

  equippedBy?: string; // character ID

  obtainedAt: Date;
  lastUsedAt: Date;
}

const ArtifactOwnedSchema = new Schema<IArtifactOwned>({
  userId: { type: String, required: true, index: true },
  artifactId: { type: String, required: true },
  artifactName: { type: String, required: true },
  rarity: { type: Number, required: true, min: 3, max: 5 },
  setName: { type: String, required: true },
  slot: { type: String, required: true },

  level: { type: Number, default: 0, min: 0, max: 20 },

  mainStat: {
    type: { type: String, required: true },
    value: { type: Number, required: true },
  },

  subStats: [{
    type: { type: String, required: true },
    value: { type: Number, required: true },
  }],

  equippedBy: String,

  obtainedAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
});

ArtifactOwnedSchema.index({ userId: 1, artifactId: 1 });
ArtifactOwnedSchema.index({ userId: 1, setName: 1 });
ArtifactOwnedSchema.index({ userId: 1, slot: 1 });
ArtifactOwnedSchema.index({ userId: 1, rarity: -1 });
ArtifactOwnedSchema.index({ equippedBy: 1 });

export const ArtifactOwned = mongoose.model<IArtifactOwned>('ArtifactOwned', ArtifactOwnedSchema);
