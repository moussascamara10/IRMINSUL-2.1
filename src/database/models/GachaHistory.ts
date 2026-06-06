import mongoose, { Schema, Document } from 'mongoose';

export interface IGachaHistory extends Document {
  userId: string;
  bannerType: 'standard' | 'character' | 'weapon';
  bannerId?: string;
  bannerName?: string;

  // Résultat
  itemType: 'character' | 'weapon';
  itemId: string;
  itemName: string;
  rarity: number;

  // Coût
  costType: 'primogens' | 'fates';
  costAmount: number;

  // Pity
  pityBefore: number;
  pityAfter: number;
  guaranteed: boolean;

  pulledAt: Date;
}

const GachaHistorySchema = new Schema<IGachaHistory>({
  userId: { type: String, required: true, index: true },
  bannerType: { type: String, required: true, enum: ['standard', 'character', 'weapon'] },
  bannerId: String,
  bannerName: String,

  itemType: { type: String, required: true, enum: ['character', 'weapon'] },
  itemId: { type: String, required: true },
  itemName: { type: String, required: true },
  rarity: { type: Number, required: true, min: 3, max: 5 },

  costType: { type: String, required: true, enum: ['primogens', 'fates'] },
  costAmount: { type: Number, required: true },

  pityBefore: { type: Number, required: true, min: 0 },
  pityAfter: { type: Number, required: true, min: 0 },
  guaranteed: { type: Boolean, required: false, default: false },

  pulledAt: { type: Date, default: Date.now },
});

GachaHistorySchema.index({ userId: 1, pulledAt: -1 });
GachaHistorySchema.index({ userId: 1, bannerType: 1 });
GachaHistorySchema.index({ pulledAt: -1 });

export const GachaHistory = mongoose.model<IGachaHistory>('GachaHistory', GachaHistorySchema);
