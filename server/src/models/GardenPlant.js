import mongoose from 'mongoose';

const { Schema } = mongoose;

export const TASK_TYPES = ['water', 'fertilize', 'mist', 'rotate', 'prune', 'repot', 'clean', 'pest-check'];
export const MOODS = ['great', 'good', 'okay', 'struggling'];

const gardenPlantSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    nickname: { type: String, required: true, trim: true, maxlength: 60 },
    speciesName: { type: String, trim: true, maxlength: 80, default: '' },
    botanicalName: { type: String, trim: true, maxlength: 100, default: '' },
    image: { type: String, default: '' },
    location: { type: String, enum: ['bedroom', 'living-room', 'study', 'bathroom', 'balcony', 'office', 'other'], default: 'other' },
    light: { type: String, enum: ['low', 'medium', 'bright-indirect', 'bright-direct', 'unsure'], default: 'unsure' },
    acquiredOn: { type: Date, default: Date.now },
    notes: { type: String, trim: true, maxlength: 500, default: '' },

    tasks: [
      {
        _id: false,
        type: { type: String, enum: TASK_TYPES, required: true },
        intervalDays: { type: Number, required: true, min: 1, max: 730 },
        enabled: { type: Boolean, default: true },
        lastDoneAt: Date,
      },
    ],

    careLog: [
      {
        type: { type: String, enum: TASK_TYPES, required: true },
        at: { type: Date, default: Date.now },
        note: { type: String, trim: true, maxlength: 200, default: '' },
      },
    ],

    diary: [
      {
        date: { type: Date, default: Date.now },
        note: { type: String, required: true, trim: true, maxlength: 1000 },
        mood: { type: String, enum: MOODS, default: 'good' },
        health: { type: Number, min: 1, max: 5, default: 4 },
      },
    ],

    growth: [
      {
        date: { type: Date, default: Date.now },
        heightCm: { type: Number, min: 0, max: 1000 },
        leafCount: { type: Number, min: 0, max: 10000 },
        note: { type: String, trim: true, maxlength: 200, default: '' },
      },
    ],

    lastSos: {
      at: Date,
      problem: String,
    },
  },
  { timestamps: true }
);

gardenPlantSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    for (const k of ['careLog', 'diary', 'growth']) {
      if (Array.isArray(ret[k])) ret[k] = ret[k].map((e) => ({ ...e, id: e._id ? String(e._id) : undefined, _id: undefined }));
    }
    return ret;
  },
});

export const GardenPlant = mongoose.models.GardenPlant || mongoose.model('GardenPlant', gardenPlantSchema);
