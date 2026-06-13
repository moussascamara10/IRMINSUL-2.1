import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  id: string;
  name: string;
  type: 'standard' | 'character' | 'weapon' | 'mystery';
  description: string;
  imageUrl?: string;
  startDate: Date;
  endDate: Date;
  featuredCharacters?: string[];
  featuredWeapons?: string[];
  isActive: boolean;
  mysteryRevealed?: boolean;
  mysteryContent?: {
    type: 'character' | 'weapon';
    items: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBanner>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['standard', 'character', 'weapon', 'mystery'],
    default: 'standard'
  },
  description: { type: String, required: true },
  imageUrl: String,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  featuredCharacters: [{ type: String }],
  featuredWeapons: [{ type: String }],
  isActive: { type: Boolean, default: false },
  mysteryRevealed: { type: Boolean, default: false },
  mysteryContent: {
    type: {
      type: String,
      enum: ['character', 'weapon']
    },
    items: [{ type: String }]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

BannerSchema.index({ id: 1 });
BannerSchema.index({ type: 1 });
BannerSchema.index({ isActive: 1 });
BannerSchema.index({ startDate: 1, endDate: 1 });

export const Banner = mongoose.model<IBanner>('Banner', BannerSchema);
