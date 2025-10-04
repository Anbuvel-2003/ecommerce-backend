// models/Cart.js
import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  cartItemId: {
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
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [1, "Quantity must be at least 1"],
    default: 1
  },
  unitPrice: {
    type: Number,
    required: [true, "Unit price is required"],
    min: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  addedDate: {
    type: Date,
    default: Date.now
  },
  
  // Additional item details for quick access (cached from product)
  productName: {
    type: String,
    trim: true
  },
  productImage: {
    type: String
  },
  productSku: {
    type: String,
    trim: true
  }
}, { _id: false });

const appliedCouponSchema = new mongoose.Schema({
  couponCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  cartId: {
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
  
  cartItems: [cartItemSchema],
  
  // Cart Summary
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  shipping: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Applied Offers
  appliedCoupons: [appliedCouponSchema],
  
  // Status
  cartStatus: {
    type: String,
    enum: ['active', 'abandoned', 'converted'],
    default: 'active',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  lastModified: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

// Compound index for unique user cart
cartSchema.index({ userId: 1, isActive: 1 });

// Index for abandoned cart tracking
cartSchema.index({ cartStatus: 1, lastModified: 1 });

// Pre-save middleware to generate cartId and update lastModified
cartSchema.pre('save', function(next) {
  if (!this.cartId) {
    this.cartId = `CART-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  
  this.lastModified = new Date();
  
  // Calculate totals
  this.calculateTotals();
  
  next();
});

// Instance method to calculate item total price
cartItemSchema.pre('validate', function(next) {
  this.totalPrice = this.quantity * this.unitPrice;
  next();
});

// Instance method to calculate all totals
cartSchema.methods.calculateTotals = function() {
  // Calculate subtotal from all cart items
  this.subtotal = this.cartItems.reduce((sum, item) => {
    item.totalPrice = item.quantity * item.unitPrice;
    return sum + item.totalPrice;
  }, 0);
  
  // Calculate discount from applied coupons
  this.discount = this.appliedCoupons.reduce((sum, coupon) => {
    return sum + coupon.discountAmount;
  }, 0);
  
  // Calculate total (subtotal - discount + tax + shipping)
  const afterDiscount = Math.max(0, this.subtotal - this.discount);
  this.total = afterDiscount + this.tax + this.shipping;
  
  // Round to 2 decimal places
  this.subtotal = Math.round(this.subtotal * 100) / 100;
  this.discount = Math.round(this.discount * 100) / 100;
  this.tax = Math.round(this.tax * 100) / 100;
  this.shipping = Math.round(this.shipping * 100) / 100;
  this.total = Math.round(this.total * 100) / 100;
};

// Instance method to add item to cart
cartSchema.methods.addItem = function(itemData) {
  // Check if item already exists
  const existingItemIndex = this.cartItems.findIndex(
    item => item.productId === itemData.productId && 
           (item.variantId || null) === (itemData.variantId || null)
  );
  
  if (existingItemIndex > -1) {
    // Update quantity of existing item
    this.cartItems[existingItemIndex].quantity += itemData.quantity || 1;
    this.cartItems[existingItemIndex].totalPrice = 
      this.cartItems[existingItemIndex].quantity * this.cartItems[existingItemIndex].unitPrice;
  } else {
    // Add new item
    const newItem = {
      cartItemId: `ITEM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      productId: itemData.productId,
      variantId: itemData.variantId,
      quantity: itemData.quantity || 1,
      unitPrice: itemData.unitPrice,
      productName: itemData.productName,
      productImage: itemData.productImage,
      productSku: itemData.productSku
    };
    this.cartItems.push(newItem);
  }
  
  this.calculateTotals();
};

// Instance method to update item quantity
cartSchema.methods.updateItemQuantity = function(cartItemId, quantity) {
  const item = this.cartItems.find(item => item.cartItemId === cartItemId);
  
  if (!item) {
    throw new Error('Cart item not found');
  }
  
  if (quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }
  
  item.quantity = quantity;
  item.totalPrice = item.quantity * item.unitPrice;
  
  this.calculateTotals();
};

// Instance method to remove item from cart
cartSchema.methods.removeItem = function(cartItemId) {
  const itemIndex = this.cartItems.findIndex(item => item.cartItemId === cartItemId);
  
  if (itemIndex === -1) {
    throw new Error('Cart item not found');
  }
  
  this.cartItems.splice(itemIndex, 1);
  this.calculateTotals();
};

// Instance method to clear cart
cartSchema.methods.clearCart = function() {
  this.cartItems = [];
  this.appliedCoupons = [];
  this.discount = 0;
  this.tax = 0;
  this.shipping = 0;
  this.calculateTotals();
};

// Instance method to apply coupon
cartSchema.methods.applyCoupon = function(couponCode, discountAmount, discountType) {
  // Check if coupon already applied
  const existingCoupon = this.appliedCoupons.find(c => c.couponCode === couponCode);
  
  if (existingCoupon) {
    throw new Error('Coupon already applied');
  }
  
  this.appliedCoupons.push({
    couponCode,
    discountAmount,
    discountType
  });
  
  this.calculateTotals();
};

// Instance method to remove coupon
cartSchema.methods.removeCoupon = function(couponCode) {
  const couponIndex = this.appliedCoupons.findIndex(c => c.couponCode === couponCode);
  
  if (couponIndex === -1) {
    throw new Error('Coupon not found');
  }
  
  this.appliedCoupons.splice(couponIndex, 1);
  this.calculateTotals();
};

// Instance method to get item count
cartSchema.methods.getItemCount = function() {
  return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
};

// Instance method to check if product exists in cart
cartSchema.methods.hasProduct = function(productId, variantId = null) {
  return this.cartItems.some(
    item => item.productId === productId && 
           (item.variantId || null) === (variantId || null)
  );
};

// Static method to find active cart by user
cartSchema.statics.findActiveByUser = function(userId) {
  return this.findOne({ 
    userId, 
    isActive: true,
    cartStatus: 'active'
  });
};

// Static method to find abandoned carts
cartSchema.statics.findAbandonedCarts = function(hoursAgo = 24) {
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return this.find({
    cartStatus: 'active',
    isActive: true,
    lastModified: { $lt: cutoffTime },
    'cartItems.0': { $exists: true } // Has at least one item
  });
};

// Static method to mark cart as abandoned
cartSchema.statics.markAbandoned = async function(cartId) {
  return this.findOneAndUpdate(
    { cartId },
    { cartStatus: 'abandoned' },
    { new: true }
  );
};

// Static method to convert cart (when order is placed)
cartSchema.statics.convertCart = async function(cartId) {
  return this.findOneAndUpdate(
    { cartId },
    { 
      cartStatus: 'converted',
      isActive: false
    },
    { new: true }
  );
};

export default mongoose.model("Cart", cartSchema);