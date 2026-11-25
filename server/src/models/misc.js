import mongoose from 'mongoose';
import { EMAIL_RE } from '../utils/validate.js';

const { Schema } = mongoose;

const toJSON = {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
};

const subscriberSchema = new Schema(
  { email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: EMAIL_RE } },
  { timestamps: true }
);
subscriberSchema.set('toJSON', toJSON);
export const Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema);

const contactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, match: EMAIL_RE },
    subject: { type: String, trim: true, maxlength: 120, default: '' },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  },
  { timestamps: true }
);
contactSchema.set('toJSON', toJSON);
export const ContactMessage = mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactSchema);

const roomPlanSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    room: { type: String, required: true },
    size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    windowSide: { type: String, enum: ['north', 'east', 'south', 'west'], default: 'south' },
    windowLight: { type: String, enum: ['low', 'medium', 'bright-indirect', 'bright-direct'], default: 'bright-indirect' },
    placements: [{ _id: false, x: Number, y: Number, product: { type: Schema.Types.ObjectId, ref: 'Product' } }],
    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);
roomPlanSchema.set('toJSON', toJSON);
export const RoomPlan = mongoose.models.RoomPlan || mongoose.model('RoomPlan', roomPlanSchema);
