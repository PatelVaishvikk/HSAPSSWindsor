import mongoose from 'mongoose';

const SabhaGrocerySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  mandal: { type: String, default: 'Windsor' },
  menu: { type: String, required: true, trim: true },
  groceriesUsed: [
    {
      name: { type: String, required: true, trim: true },
      quantity: { type: Number, required: true },
      unit: { type: String, required: true, trim: true }
    }
  ],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

SabhaGrocerySchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

export default mongoose.models.SabhaGrocery || mongoose.model('SabhaGrocery', SabhaGrocerySchema); 