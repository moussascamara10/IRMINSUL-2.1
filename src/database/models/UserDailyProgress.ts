import mongoose, { Document } from 'mongoose';

export interface IUserDailyProgress extends Document {
  userId: string;
  date: Date;
  completedTasks: string[];
  totalPrimogensEarned: number;
  totalMoraEarned: number;
  streak: number;
}

const UserDailyProgressSchema = new mongoose.Schema<IUserDailyProgress>({
  userId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  completedTasks: [{ type: String }],
  totalPrimogensEarned: { type: Number, default: 0 },
  totalMoraEarned: { type: Number, default: 0 },
  streak: { type: Number, default: 0 }
});

UserDailyProgressSchema.index({ userId: 1, date: 1 }, { unique: true });

export const UserDailyProgress = mongoose.model<IUserDailyProgress>('UserDailyProgress', UserDailyProgressSchema);
