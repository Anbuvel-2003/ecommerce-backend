// models/Wishlist.js
import mongoose from "mongoose";

const wishlistItemSchema = new mongoose.Schema({
  wishlistItemId: {
    type: String,
    required: true
  },
  productId: {
    type: String,
    required: [true, "Product ID is required"],
    ref: 'Product',
    index: true
  },
  variantId: {
    type: String,
    ref: 'Product'
  },
  addedDate: {
    type: Date,
    default: Date.now
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Product details for quick access (cached from product)
  productName: {
    type: String,
    trim: true
  },
  productImage: {
    type: String
  },
  currentPrice: {
    type: Number,
    min: 0
  },
  originalPriceWhenSaved: {
    type: Number,
    min: 0
  }
}, { _id: false });

const wishlistSchema = new mongoose.Schema({
  wishlistId: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: String,
    required: [true, "User ID is required"],
    ref: 'User',
    index: true
  },
  wishlistName: {
    type: String,
    default: 'My Wishlist',
    trim: true,
    maxlength: 100
  },
  
  wishlistItems: [wishlistItemSchema],
  
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },
  isDefault: {
    type: Boolean,
    default: true,
    index: true
  }
}, { 
  timestamps: true 
});

// Compound index for user wishlists
wishlistSchema.index({ userId: 1, isDefault: 1 });
wishlistSchema.index({ userId: 1, wishlistName: 1 });

// Pre-save middleware to generate wishlistId
wishlistSchema.pre('save', function(next) {
  if (!this.wishlistId) {
    this.wishlistId = `WL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  next();
});

// Instance method to add item to wishlist
wishlistSchema.methods.addItem = function(itemData) {
  // Check if item already exists
  const existingItem = this.wishlistItems.find(
    item => item.productId === itemData.productId && 
           (item.variantId || null) === (itemData.variantId || null)
  );
  
  if (existingItem) {
    throw new Error('Product already in wishlist');
  }
  
  // Add new item
  const newItem = {
    wishlistItemId: `WLI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    productId: itemData.productId,
    variantId: itemData.variantId,
    priority: itemData.priority || 'medium',
    notes: itemData.notes,
    productName: itemData.productName,
    productImage: itemData.productImage,
    currentPrice: itemData.currentPrice,
    originalPriceWhenSaved: itemData.currentPrice
  };
  
  this.wishlistItems.push(newItem);
};

// Instance method to remove item from wishlist
wishlistSchema.methods.removeItem = function(wishlistItemId) {
  const itemIndex = this.wishlistItems.findIndex(
    item => item.wishlistItemId === wishlistItemId
  );
  
  if (itemIndex === -1) {
    throw new Error('Wishlist item not found');
  }
  
  this.wishlistItems.splice(itemIndex, 1);
};

// Instance method to update item priority
wishlistSchema.methods.updateItemPriority = function(wishlistItemId, priority) {
  const item = this.wishlistItems.find(
    item => item.wishlistItemId === wishlistItemId
  );
  
  if (!item) {
    throw new Error('Wishlist item not found');
  }
  
  if (!['high', 'medium', 'low'].includes(priority)) {
    throw new Error('Invalid priority');
  }
  
  item.priority = priority;
};

// Instance method to update item notes
wishlistSchema.methods.updateItemNotes = function(wishlistItemId, notes) {
  const item = this.wishlistItems.find(
    item => item.wishlistItemId === wishlistItemId
  );
  
  if (!item) {
    throw new Error('Wishlist item not found');
  }
  
  item.notes = notes;
};

// Instance method to update item price
wishlistSchema.methods.updateItemPrice = function(wishlistItemId, newPrice) {
  const item = this.wishlistItems.find(
    item => item.wishlistItemId === wishlistItemId
  );
  
  if (!item) {
    throw new Error('Wishlist item not found');
  }
  
  item.currentPrice = newPrice;
};

// Instance method to check if product exists in wishlist
wishlistSchema.methods.hasProduct = function(productId, variantId = null) {
  return this.wishlistItems.some(
    item => item.productId === productId && 
           (item.variantId || null) === (variantId || null)
  );
};

// Instance method to get items by priority
wishlistSchema.methods.getItemsByPriority = function(priority) {
  return this.wishlistItems.filter(item => item.priority === priority);
};

// Instance method to get price drops
wishlistSchema.methods.getPriceDrops = function() {
  return this.wishlistItems.filter(
    item => item.currentPrice < item.originalPriceWhenSaved
  ).map(item => ({
    ...item.toObject(),
    priceDrop: item.originalPriceWhenSaved - item.currentPrice,
    priceDropPercentage: Math.round(
      ((item.originalPriceWhenSaved - item.currentPrice) / item.originalPriceWhenSaved) * 100
    )
  }));
};

// Instance method to clear wishlist
wishlistSchema.methods.clearWishlist = function() {
  this.wishlistItems = [];
};

// Instance method to get item count
wishlistSchema.methods.getItemCount = function() {
  return this.wishlistItems.length;
};

// Static method to find default wishlist by user
wishlistSchema.statics.findDefaultByUser = function(userId) {
  return this.findOne({ userId, isDefault: true });
};

// Static method to find all wishlists by user
wishlistSchema.statics.findAllByUser = function(userId) {
  return this.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
};

// Static method to find public wishlists
wishlistSchema.statics.findPublicWishlists = function(limit = 20) {
  return this.find({ isPublic: true })
    .limit(limit)
    .sort({ updatedAt: -1 });
};

// Virtual for total value
wishlistSchema.virtual('totalValue').get(function() {
  return this.wishlistItems.reduce((sum, item) => sum + (item.currentPrice || 0), 0);
});

// Virtual for potential savings
wishlistSchema.virtual('potentialSavings').get(function() {
  return this.wishlistItems.reduce((sum, item) => {
    const priceDrop = item.originalPriceWhenSaved - item.currentPrice;
    return sum + (priceDrop > 0 ? priceDrop : 0);
  }, 0);
});

// Ensure virtuals are included in JSON output
wishlistSchema.set('toJSON', { virtuals: true });
wishlistSchema.set('toObject', { virtuals: true });

export default mongoose.model("Wishlist", wishlistSchema);