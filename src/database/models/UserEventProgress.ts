import mongoose, { Document } from 'mongoose';

interface IUserEventProgress {
  userId: string;
  eventId: string;
  eventCurrency: number;
  completedActivities: string[];
  claimedMilestones: number[];
  lastActivityDate: Date;
}

interface UserEventProgressDocument extends IUserEventProgress, Document {}

const UserEventProgressSchema = new mongoose.Schema<UserEventProgressDocument>({
  userId: { type: String, required: true, index: true },
  eventId: { type: String, required: true, index: true },
  eventCurrency: { type: Number, default: 0, min: 0 },
  completedActivities: [{ type: String }],
  claimedMilestones: [{ type: Number }],
  lastActivityDate: { type: Date, default: Date.now }
});

UserEventProgressSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export const UserEventProgress = mongoose.model<UserEventProgressDocument>('UserEventProgress', UserEventProgressSchema);
