import mongoose from 'mongoose';

const GroceryItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, required: true, trim: true },
  minStock: { type: Number, default: 0 },
  toBuy: { type: Boolean, default: false },
  note: { type: String, trim: true, default: '' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

GroceryItemSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

export default mongoose.models.GroceryItem || mongoose.model('GroceryItem', GroceryItemSchema); 