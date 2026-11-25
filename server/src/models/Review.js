import mongoose from 'mongoose';

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // absent for seeded sample reviews
    name: { type: String, required: true, trim: true, maxlength: 60 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 80, default: '' },
    comment: { type: String, required: true, trim: true, minlength: 5, maxlength: 1000 },
    verifiedPurchase: { type: Boolean, default: false },
    isSample: { type: Boolean, default: false }, // demo content shipped with the seed data
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } });

reviewSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
