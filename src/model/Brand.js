// models/Brand.js
import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
  brandId: {
    type: String,
    unique: true,
    required: true,
  },
  brandName: {
    type: String,
    required: [true, "Brand name is required"],
    unique: true,
    trim: true,
  },
  brandDescription: {
    type: String,
    trim: true,
  },
  brandLogo: {
    type: String, // URL
  },
  brandWebsite: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty
        // Basic URL validation
        return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(v);
      },
      message: 'Invalid website URL'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { 
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Index for faster queries
brandSchema.index({ brandName: 1 });
brandSchema.index({ isActive: 1 });

// Pre-save middleware to generate brandId if not provided
brandSchema.pre('save', async function(next) {
  if (!this.brandId) {
    // Generate unique brandId: BRD-timestamp-random
    this.brandId = `BRD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  next();
});

export default mongoose.model("Brand", brandSchema);