import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ORDER_STATUSES = ['Order Placed', 'Processing', 'Packed', 'Shipped', 'Delivered'];

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [
      {
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        name: String,
        slug: String,
        image: String,
        isPlant: Boolean,
        unitPrice: { type: Number, required: true }, // what the customer paid per unit (after kit discount)
        listPrice: { type: Number, required: true }, // price before kit discount
        quantity: { type: Number, required: true, min: 1 },
        kitName: String,
      },
    ],
    shippingAddress: {
      fullName: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
    },
    payment: {
      method: { type: String, enum: ['cod', 'upi', 'card'], required: true },
      status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
      // Mock payments only: we keep a masked reference, never full card data or CVV.
      reference: String,
      transactionId: String,
    },
    pricing: {
      itemsTotal: Number, // MRP-based total of items (for "you saved")
      subtotal: Number,
      kitDiscount: Number,
      couponCode: String,
      couponDiscount: Number,
      shipping: Number,
      total: Number,
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'Order Placed' },
    statusHistory: [{ _id: false, status: String, at: Date }],
    placedAt: { type: Date, default: Date.now },
    estimatedDelivery: Date,
  },
  { timestamps: true }
);

orderSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
