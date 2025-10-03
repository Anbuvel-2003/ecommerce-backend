// models/Category.js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  categoryId: {
    type: String,
    unique: true,
    required: true,
  },
  categoryName: {
    type: String,
    required: [true, "Category name is required"],
    unique: true,
    trim: true,
  },
  categoryDescription: {
    type: String,
    trim: true,
  },
  categoryImage: {
    type: String, // URL
  },
  parentCategoryId: {
    type: String,
    default: null, // null for root categories
  },
  categoryLevel: {
    type: Number,
    default: 1,
    min: 1,
  },
  categoryPath: {
    type: String, // For breadcrumb: "Electronics > Mobile > Smartphones"
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, { 
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Index for faster queries
categorySchema.index({ categoryName: 1 });
categorySchema.index({ parentCategoryId: 1 });
categorySchema.index({ isActive: 1 });

// Pre-save middleware to generate categoryId if not provided
categorySchema.pre('save', async function(next) {
  if (!this.categoryId) {
    // Generate unique categoryId: CAT-timestamp-random
    this.categoryId = `CAT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  next();
});

// Method to get subcategories
categorySchema.methods.getSubcategories = async function() {
  return await mongoose.model('Category').find({ 
    parentCategoryId: this.categoryId,
    isActive: true 
  });
};

export default mongoose.model("Category", categorySchema);