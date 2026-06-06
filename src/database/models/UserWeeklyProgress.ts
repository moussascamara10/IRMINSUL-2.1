import mongoose, { Document } from 'mongoose';

export interface IUserWeeklyProgress extends Document {
  userId: string;
  weekNumber: number;
  year: number;
  completedTasks: string[];
  totalPrimogensEarned: number;
  totalMoraEarned: number;
  totalFatesEarned: number;
  raidCompletions: number;
  bossCompletions: number;
}

const UserWeeklyProgressSchema = new mongoose.Schema<IUserWeeklyProgress>({
  userId: { type: String, required: true, index: true },
  weekNumber: { type: Number, required: true },
  year: { type: Number, required: true },
  completedTasks: [{ type: String }],
  totalPrimogensEarned: { type: Number, default: 0 },
  totalMoraEarned: { type: Number, default: 0 },
  totalFatesEarned: { type: Number, default: 0 },
  raidCompletions: { type: Number, default: 0 },
  bossCompletions: { type: Number, default: 0 }
});

UserWeeklyProgressSchema.index({ userId: 1, weekNumber: 1, year: 1 }, { unique: true });

export const UserWeeklyProgress = mongoose.model<IUserWeeklyProgress>('UserWeeklyProgress', UserWeeklyProgressSchema);
