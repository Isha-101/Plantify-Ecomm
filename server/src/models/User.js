import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { EMAIL_RE } from '../utils/validate.js';

const { Schema } = mongoose;

export const LIGHT_LEVELS = ['low', 'medium', 'bright-indirect', 'bright-direct'];
export const PLANT_TYPES = ['foliage', 'flowering', 'succulent', 'herb'];

const addressSchema = new Schema(
  {
    label: { type: String, trim: true, maxlength: 30, default: 'Home' },
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, match: /^[0-9]{10}$/ },
    line1: { type: String, required: true, trim: true, maxlength: 120 },
    line2: { type: String, trim: true, maxlength: 120, default: '' },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    state: { type: String, required: true, trim: true, maxlength: 60 },
    pincode: { type: String, required: true, trim: true, match: /^[0-9]{6}$/ },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: EMAIL_RE },
    // bcrypt hash only – never returned by default.
    password: { type: String, required: true, select: false },

    profile: {
      phone: { type: String, trim: true, maxlength: 15, default: '' },
      city: { type: String, trim: true, maxlength: 60, default: '' },
      bio: { type: String, trim: true, maxlength: 240, default: '' },
    },

    preferences: {
      experience: { type: String, enum: ['beginner', 'intermediate', 'expert'], default: 'beginner' },
      preferredTypes: [{ type: String, enum: PLANT_TYPES }],
      lightConditions: { type: String, enum: [...LIGHT_LEVELS, 'unsure'], default: 'unsure' },
      pets: { type: String, enum: ['yes', 'no', 'unspecified'], default: 'unspecified' },
      petInfo: { type: String, trim: true, maxlength: 120, default: '' },
      // Drives seasonal watering adjustments in the care calendar.
      climate: { type: String, enum: ['tropical-india', 'temperate-north', 'temperate-south'], default: 'tropical-india' },
    },

    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],

    cart: [
      {
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1, max: 99 },
        kitId: { type: String, trim: true, maxlength: 40 },
        kitName: { type: String, trim: true, maxlength: 60 },
      },
    ],

    addresses: [addressSchema],

    gamification: {
      points: { type: Number, default: 0 },
      badges: [{ _id: false, key: String, earnedAt: { type: Date, default: Date.now } }],
      streak: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastDay: { type: String, default: '' }, // YYYY-MM-DD in the user's timezone
      },
      // Guards against farming points: "action:plantId:YYYY-MM-DD" keys, trimmed to recent days.
      recentActions: [{ type: String }],
      counters: {
        matchmaker: { type: Number, default: 0 },
        sos: { type: Number, default: 0 },
        kits: { type: Number, default: 0 },
        planner: { type: Number, default: 0 },
      },
    },

    lastMatch: {
      at: Date,
      personality: String,
      answers: Schema.Types.Mixed,
      topProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hash(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.password;
    return ret;
  },
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
