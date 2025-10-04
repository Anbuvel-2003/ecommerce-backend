// models/Order.js
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  street: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  landmark: { type: String, trim: true },
  contactName: { type: String, trim: true },
  contactPhone: { type: String, trim: true }
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  orderItemId: {
    type: String,
    required: true
  },
  productId: {
    type: String,
    required: [true, "Product ID is required"],
    ref: 'Product'
  },
  variantId: {
    type: String,
    ref: 'Product'
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: 1
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
  
  // Product snapshot at time of order
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
  },
  productSpecifications: {
    type: mongoose.Schema.Types.Mixed
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

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true
  },
  orderNumber: {
    type: String,
    unique: true,
    required: true,
    uppercase: true
  },
  userId: {
    type: String,
    required: [true, "User ID is required"],
    ref: 'User',
    index: true
  },
  
  // Order Items
  orderItems: [orderItemSchema],
  
  // Financial Details
  financials: {
    subtotal: {
      type: Number,
      required: true,
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
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    }
  },
  
  // Applied Discounts
  appliedCoupons: [appliedCouponSchema],
  
  // Addresses
  billingAddress: {
    type: addressSchema,
    required: true
  },
  shippingAddress: {
    type: addressSchema,
    required: true
  },
  
  // Order Status and Tracking
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'],
    default: 'pending',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partial'],
    default: 'pending',
    index: true
  },
  
  // Status History
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: String
  }],
  
  // Dates
  orderDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  expectedDeliveryDate: {
    type: Date
  },
  actualDeliveryDate: {
    type: Date
  },
  
  // Shipping Information
  shippingMethod: {
    type: String,
    trim: true
  },
  shippingProvider: {
    type: String,
    trim: true
  },
  trackingNumber: {
    type: String,
    trim: true,
    index: true
  },
  estimatedDeliveryTime: {
    type: String
  },
  
  // Special Instructions
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  giftWrapping: {
    type: Boolean,
    default: false
  },
  giftMessage: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Payment Information
  paymentMethod: {
    type: String,
    trim: true
  },
  paymentTransactionId: {
    type: String,
    trim: true
  },
  
  // Customer Information (cached for quick access)
  customerName: {
    type: String,
    trim: true
  },
  customerEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ userId: 1, orderStatus: 1 });
orderSchema.index({ orderDate: -1 });
orderSchema.index({ orderStatus: 1, orderDate: -1 });
orderSchema.index({ paymentStatus: 1 });

// Pre-save middleware to generate IDs and calculate totals
orderSchema.pre('save', function(next) {
  // Generate orderId
  if (!this.orderId) {
    this.orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  
  // Generate orderNumber
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    this.orderNumber = `ORD${year}${month}${random}`;
  }
  
  // Calculate item totals
  this.orderItems.forEach(item => {
    item.totalPrice = item.quantity * item.unitPrice;
  });
  
  next();
});

// Instance method to add status history
orderSchema.methods.addStatusHistory = function(status, note = '', updatedBy = null) {
  this.statusHistory.push({
    status,
    timestamp: new Date(),
    note,
    updatedBy
  });
};

// Instance method to update order status
orderSchema.methods.updateOrderStatus = function(newStatus, note = '', updatedBy = null) {
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'returned'],
    'delivered': ['returned'],
    'cancelled': [],
    'returned': ['refunded'],
    'refunded': []
  };
  
  const currentStatus = this.orderStatus;
  
  if (!validTransitions[currentStatus].includes(newStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
  }
  
  this.orderStatus = newStatus;
  this.addStatusHistory(newStatus, note, updatedBy);
  
  // Set delivery date if status is delivered
  if (newStatus === 'delivered' && !this.actualDeliveryDate) {
    this.actualDeliveryDate = new Date();
  }
};

// Instance method to update payment status
orderSchema.methods.updatePaymentStatus = function(newStatus, transactionId = null) {
  this.paymentStatus = newStatus;
  if (transactionId) {
    this.paymentTransactionId = transactionId;
  }
  this.addStatusHistory(`Payment: ${newStatus}`, `Transaction ID: ${transactionId || 'N/A'}`);
};

// Instance method to calculate delivery time
orderSchema.methods.getDeliveryTime = function() {
  if (this.actualDeliveryDate && this.orderDate) {
    const diff = this.actualDeliveryDate - this.orderDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  return null;
};

// Instance method to check if order can be cancelled
orderSchema.methods.canCancel = function() {
  return ['pending', 'confirmed', 'processing'].includes(this.orderStatus);
};

// Instance method to check if order can be returned
orderSchema.methods.canReturn = function() {
  if (this.orderStatus !== 'delivered') return false;
  
  // Can return within 30 days of delivery
  if (this.actualDeliveryDate) {
    const daysSinceDelivery = (Date.now() - this.actualDeliveryDate) / (1000 * 60 * 60 * 24);
    return daysSinceDelivery <= 30;
  }
  return false;
};

// Instance method to get total items count
orderSchema.methods.getTotalItems = function() {
  return this.orderItems.reduce((sum, item) => sum + item.quantity, 0);
};

// Static method to find orders by user
orderSchema.statics.findByUser = function(userId, options = {}) {
  const { page = 1, limit = 20, status } = options;
  const skip = (page - 1) * limit;
  
  const filter = { userId };
  if (status) filter.orderStatus = status;
  
  return this.find(filter)
    .sort({ orderDate: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to find recent orders
orderSchema.statics.findRecent = function(days = 7, limit = 50) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({ orderDate: { $gte: cutoffDate } })
    .sort({ orderDate: -1 })
    .limit(limit);
};

// Static method to find pending orders
orderSchema.statics.findPending = function() {
  return this.find({ 
    orderStatus: { $in: ['pending', 'confirmed'] },
    paymentStatus: 'paid'
  }).sort({ orderDate: 1 });
};

// Static method to generate sales report
orderSchema.statics.generateSalesReport = async function(startDate, endDate) {
  const orders = await this.find({
    orderDate: { $gte: startDate, $lte: endDate },
    orderStatus: { $nin: ['cancelled', 'refunded'] },
    paymentStatus: 'paid'
  });
  
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.financials.total, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  return {
    totalOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    period: {
      start: startDate,
      end: endDate
    }
  };
};

// Virtual for order summary
orderSchema.virtual('summary').get(function() {
  return {
    orderId: this.orderId,
    orderNumber: this.orderNumber,
    total: this.financials.total,
    status: this.orderStatus,
    itemCount: this.getTotalItems()
  };
});

// Ensure virtuals are included in JSON output
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

export default mongoose.model("Order", orderSchema);