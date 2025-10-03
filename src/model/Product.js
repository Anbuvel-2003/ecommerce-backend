// models/Product.js
import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  imageType: { 
    type: String, 
    enum: ['primary', 'secondary', 'gallery'],
    default: 'gallery'
  },
  altText: { type: String },
  sortOrder: { type: Number, default: 0 }
}, { _id: false });

const videoSchema = new mongoose.Schema({
  videoUrl: { type: String, required: true },
  videoType: { 
    type: String, 
    enum: ['demo', 'review', 'unboxing']
  },
  thumbnail: { type: String }
}, { _id: false });

const specificationSchema = new mongoose.Schema({
  specName: { type: String, required: true },
  specValue: { type: String, required: true },
  specUnit: { type: String }
}, { _id: false });

const variantSchema = new mongoose.Schema({
  variantId: { type: String, required: true },
  variantType: { 
    type: String, 
    enum: ['size', 'color', 'material', 'style'],
    required: true
  },
  variantValue: { type: String, required: true },
  variantPrice: { type: Number },
  variantSku: { type: String },
  variantImage: { type: String }
}, { _id: false });

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    unique: true,
    required: true,
  },
  productName: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
    index: true
  },
  productDescription: {
    type: String,
    trim: true
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 500
  },
  sku: {
    type: String,
    required: [true, "SKU is required"],
    unique: true,
    uppercase: true,
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  categoryId: {
    type: String,
    ref: 'Category',
    index: true
  },
  brandId: {
    type: String,
    ref: 'Brand',
    index: true
  },
  sellerId: {
    type: String,
    ref: 'User'
  },
  
  // Pricing
  pricing: {
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: 0
    },
    sellingPrice: {
      type: Number,
      required: [true, "Selling price is required"],
      min: 0
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    taxPercentage: {
      type: Number,
      default: 0,
      min: 0
    },
    finalPrice: {
      type: Number,
      default: 0
    }
  },
  
  // Images and Media
  images: [imageSchema],
  videos: [videoSchema],
  
  // Product Specifications
  specifications: [specificationSchema],
  
  // Variants
  variants: [variantSchema],
  
  // SEO
  seo: {
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    metaKeywords: [{ type: String }],
    slug: { 
      type: String, 
      unique: true,
      lowercase: true,
      trim: true
    }
  },
  
  // Product Attributes
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    unit: { 
      type: String, 
      default: 'cm',
      enum: ['cm', 'inch', 'm']
    }
  },
  
  // Status and Flags
  productStatus: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'discontinued'],
    default: 'draft',
    index: true
  },
  isFeatured: { type: Boolean, default: false, index: true },
  isNew: { type: Boolean, default: false },
  isBestseller: { type: Boolean, default: false },
  isDigital: { type: Boolean, default: false },
  
  // Ratings and Reviews
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: 0
  },
  ratingDistribution: {
    five: { type: Number, default: 0 },
    four: { type: Number, default: 0 },
    three: { type: Number, default: 0 },
    two: { type: Number, default: 0 },
    one: { type: Number, default: 0 }
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
productSchema.index({ productName: 'text', shortDescription: 'text' });
productSchema.index({ 'pricing.sellingPrice': 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ createdAt: -1 });

// Pre-save middleware to generate productId and calculate final price
productSchema.pre('save', async function(next) {
  // Generate productId if not exists
  if (!this.productId) {
    this.productId = `PRD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  
  // Generate slug from product name if not exists
  if (!this.seo.slug && this.productName) {
    this.seo.slug = this.productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Calculate final price
  this.calculateFinalPrice();
  
  next();
});

// Pre-update middleware
productSchema.pre(['findOneAndUpdate', 'updateOne'], function(next) {
  const update = this.getUpdate();
  
  if (update.pricing) {
    // Recalculate final price on update
    if (update.pricing.sellingPrice !== undefined) {
      const sellingPrice = update.pricing.sellingPrice;
      const discountAmount = update.pricing.discountAmount || 0;
      const taxPercentage = update.pricing.taxPercentage || 0;
      
      const priceAfterDiscount = sellingPrice - discountAmount;
      const taxAmount = (priceAfterDiscount * taxPercentage) / 100;
      update.pricing.finalPrice = priceAfterDiscount + taxAmount;
    }
  }
  
  next();
});

// Instance method to calculate final price
productSchema.methods.calculateFinalPrice = function() {
  const { sellingPrice, discountAmount, taxPercentage } = this.pricing;
  const priceAfterDiscount = sellingPrice - discountAmount;
  const taxAmount = (priceAfterDiscount * taxPercentage) / 100;
  this.pricing.finalPrice = Math.round((priceAfterDiscount + taxAmount) * 100) / 100;
};

// Instance method to update rating
productSchema.methods.updateRating = function(newRating) {
  const oldAverage = this.averageRating;
  const oldTotal = this.totalReviews;
  
  // Update rating distribution
  if (newRating >= 1 && newRating <= 5) {
    const ratingKey = ['one', 'two', 'three', 'four', 'five'][Math.floor(newRating) - 1];
    this.ratingDistribution[ratingKey] += 1;
  }
  
  // Calculate new average
  this.totalReviews = oldTotal + 1;
  this.averageRating = ((oldAverage * oldTotal) + newRating) / this.totalReviews;
  this.averageRating = Math.round(this.averageRating * 10) / 10;
};

// Static method to find featured products
productSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ isFeatured: true, productStatus: 'active' })
    .limit(limit)
    .sort({ createdAt: -1 });
};

// Static method to find bestsellers
productSchema.statics.findBestsellers = function(limit = 10) {
  return this.find({ isBestseller: true, productStatus: 'active' })
    .limit(limit)
    .sort({ totalReviews: -1 });
};

export default mongoose.model("Product", productSchema);