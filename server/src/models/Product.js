import mongoose from 'mongoose';

const { Schema } = mongoose;

export const CATEGORY_SLUGS = [
  'indoor-plants',
  'outdoor-plants',
  'succulents',
  'flowering-plants',
  'seeds',
  'pots-planters',
  'gardening-tools',
  'soil-fertilizers',
  'plant-accessories',
  'plant-kits',
];
export const ROOMS = ['bedroom', 'living-room', 'study', 'bathroom', 'balcony', 'office'];
export const SPACES = ['small-desk', 'small-shelf', 'medium-room', 'large-floor', 'balcony'];

const careSchema = new Schema(
  {
    watering: String,
    light: String,
    soil: String,
    fertilizer: String,
    humidity: String,
    temperature: String,
    repotting: String,
    pruning: String,
    tips: [String],
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    botanicalName: { type: String, trim: true, default: '' },
    description: { type: String, required: true },
    shortDescription: { type: String, default: '' },

    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 }, // set when discounted
    category: { type: String, required: true, enum: CATEGORY_SLUGS, index: true },
    subcategory: { type: String, trim: true, default: '' },

    image: { type: String, required: true },
    gallery: [String],

    stock: { type: Number, required: true, min: 0, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    numReviews: { type: Number, min: 0, default: 0 },
    popularity: { type: Number, min: 0, default: 0 }, // units sold – drives "Popularity" sorting
    tags: [{ type: String, lowercase: true, trim: true }],
    featured: { type: Boolean, default: false, index: true },

    // ---- Plant attributes (null / empty for non-plant products) ----
    isPlant: { type: Boolean, default: false, index: true },
    plantType: { type: String, enum: ['foliage', 'flowering', 'succulent', 'herb', null], default: null },
    difficulty: { type: String, enum: ['easy', 'moderate', 'hard', null], default: null },
    light: { type: String, enum: ['low', 'medium', 'bright-indirect', 'bright-direct', null], default: null }, // ideal
    lightTolerance: [{ type: String, enum: ['low', 'medium', 'bright-indirect', 'bright-direct'] }], // survivable range
    watering: {
      label: String, // human readable e.g. "Every 10–14 days"
      intervalDays: Number, // used by the care calendar
      note: String,
    },
    petSafe: { type: String, enum: ['safe', 'toxic', 'unknown', 'na'], default: 'na' },
    petNote: { type: String, default: '' },
    growthRate: { type: String, enum: ['slow', 'moderate', 'fast', null], default: null },
    matureSize: {
      heightCm: Number,
      spreadCm: Number,
      label: String,
    },
    placement: { type: String, enum: ['indoor', 'outdoor', 'both', 'na'], default: 'na' },
    rooms: [{ type: String, enum: ROOMS }],
    spaces: [{ type: String, enum: SPACES }],
    careTime: { type: String, enum: ['minimal', 'moderate', 'high', null], default: null },
    humidity: { type: String, enum: ['low', 'medium', 'high', null], default: null },
    temperature: { minC: Number, maxC: Number },
    soilType: { type: String, enum: ['well-draining', 'standard', 'moisture-retentive', 'none', null], default: null },
    potSizeCm: { min: Number, max: Number }, // recommended pot diameter for this plant
    care: careSchema,

    // ---- Product compatibility ----
    compatibility: {
      pairsWith: [String], // slugs of products that go well with this one
      notes: { type: String, default: '' },
    },

    // ---- Supplies (pots, soil, tools …) ----
    supply: {
      role: { type: String, enum: ['plant', 'pot', 'soil', 'fertilizer', 'tool', 'accessory', 'seed', 'kit', null], default: null },
      diameterMinCm: Number, // pots: smallest inner diameter in the pack
      diameterMaxCm: Number, // pots: largest inner diameter in the pack
      hasDrainage: Boolean,
      material: String,
      soilFor: [String], // soils: which soilType values it suits
      suitableFor: [String], // free-form tags (e.g. "succulents", "herbs")
    },

    // ---- Bundles ----
    kitItems: [{ _id: false, product: { type: Schema.Types.ObjectId, ref: 'Product' }, quantity: { type: Number, default: 1, min: 1 } }],
  },
  { timestamps: true }
);

productSchema.virtual('discountPercent').get(function discountPercent() {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});
productSchema.virtual('beginnerFriendly').get(function beginnerFriendly() {
  return this.difficulty === 'easy' || (this.category === 'plant-kits' && this.subcategory === 'Beginner Kit');
});

productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

productSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    if (Array.isArray(ret.kitItems)) {
      ret.kitItems = ret.kitItems.map((k) => ({ product: k.product, quantity: k.quantity }));
    }
    return ret;
  },
});

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
